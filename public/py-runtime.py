# =============================================================================
# Start2Code — Python runtime harness.
#
# Loaded by public/runner.html and executed by PyScript. It wires print/input up
# to the console in the parent window, then runs the student's program (handed
# over as window.s2cSource) and turns any crash into a message a child can act
# on rather than a raw traceback.
# =============================================================================
import sys
import ast
import asyncio
import builtins
import traceback

from pyscript import window as _w

STUDENT_FILE = "your_code.py"


class _Stream:
    """A file-like object that forwards writes to the parent window."""

    def __init__(self, name):
        self._name = name

    def write(self, text):
        if text:
            _w.s2cWrite(self._name, text)
        return len(text) if text else 0

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        pass

    def isatty(self):
        return False


sys.stdout = _Stream("out")
sys.stderr = _Stream("err")


def _s2c_input(prompt=""):
    text = "" if prompt is None else str(prompt)
    value = _w.s2cInput(text)
    if value is None:
        raise EOFError("The program asked for input but nothing was typed in.")
    # Echo the prompt and the answer so the console reads like a real terminal.
    sys.stdout.write(text + str(value) + "\n")
    return str(value)


builtins.input = _s2c_input


# -----------------------------------------------------------------------------
# Friendly explanations for the mistakes beginners actually make.
# -----------------------------------------------------------------------------
def _hint(exc):
    name = type(exc).__name__
    text = str(exc)

    if isinstance(exc, IndentationError):
        return ("Python cares about indentation. Every line inside an if, a loop or a "
                "function needs the same number of spaces in front of it.")
    if isinstance(exc, SyntaxError):
        return ("Python could not understand this line. Look for a missing ':' at the end, "
                "or a bracket or quote that was never closed.")
    if isinstance(exc, ZeroDivisionError):
        return "You cannot divide a number by zero."
    if isinstance(exc, NameError):
        missing = text.split("'")[1] if "'" in text else "that name"
        return ("Python has never seen '%s' before. Check the spelling, and make sure you "
                "created it before using it." % missing)
    if isinstance(exc, ModuleNotFoundError):
        missing = text.split("'")[1] if "'" in text else "that module"
        return ("The module '%s' is not available here. Only some libraries work in the "
                "browser - pygame, math, random and time all do." % missing)
    if isinstance(exc, IndexError):
        return "You asked for an item that is past the end of the list. Remember the first item is number 0."
    if isinstance(exc, KeyError):
        return "That key is not in the dictionary. Check the spelling, or add it first."
    if isinstance(exc, AttributeError):
        return "That object does not have the thing you asked for. Check the spelling after the dot."
    if isinstance(exc, TypeError):
        return ("The values you used do not fit together. Mixing text and numbers is a common "
                "cause - try int(...) or str(...) to convert one of them.")
    if isinstance(exc, ValueError):
        return "The value has the right type but the wrong content - for example int('hello')."
    if isinstance(exc, RecursionError):
        return "A function kept calling itself and never stopped."
    if isinstance(exc, KeyboardInterrupt):
        return "The program was stopped."
    return "%s: %s" % (name, text)


def _line_of(number):
    """The student's source line `number`, if it exists.

    traceback cannot find it on its own: the code was compiled from a string,
    so there is no file on disk for linecache to read.
    """
    try:
        return _source_lines[number - 1].strip()
    except (IndexError, TypeError):
        return ""


def _report(exc):
    """Print a compact, student-focused error report to stderr."""
    lines = ["\n── Something went wrong ──\n"]

    if isinstance(exc, SyntaxError) and exc.lineno:
        lines.append("Line %d: %s\n" % (exc.lineno, type(exc).__name__))
        text = exc.text or _line_of(exc.lineno)
        if text:
            lines.append("    %s\n" % text.rstrip())
    else:
        # Keep only the frames that belong to the student's own file; the
        # harness frames are noise to them.
        frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == STUDENT_FILE]
        if frames:
            last = frames[-1]
            lines.append("Line %d: %s\n" % (last.lineno, type(exc).__name__))
            text = last.line or _line_of(last.lineno)
            if text:
                lines.append("    %s\n" % text.strip())
            if len(frames) > 1:
                trail = " -> ".join("line %d" % f.lineno for f in frames)
                lines.append("    (path through your code: %s)\n" % trail)
        else:
            lines.append("%s\n" % type(exc).__name__)

    lines.append("\n%s\n" % _hint(exc))
    sys.stderr.write("".join(lines))


# -----------------------------------------------------------------------------
# Letting the browser breathe, without the child having to know.
#
# A browser runs everything on one thread. A game loop that never hands control
# back freezes the whole tab: no drawing, no clicks, no way to press Stop. The
# standard cure is to make the program async and `await asyncio.sleep(0)` once
# per frame — which is exactly the part a ten-year-old should not have to read.
#
# So the child writes an ordinary pygame loop, and this rewrites it on the way
# in: every `pygame.display.flip()` (or `update()`) is followed by a pause, and
# any function that draws is made async and awaited where it is called. The
# line numbers are untouched, so error messages still point at the child's own
# lines.
#
# Code that already uses asyncio is left exactly as written — lessons from
# before this existed, and anyone who knows what they are doing.
# -----------------------------------------------------------------------------
_FRAME_CALLS = {"flip", "update"}


async def _s2c_pause():
    await asyncio.sleep(0)


def _is_frame_call(node):
    """True for a statement like pygame.display.flip() or display.update()."""
    if not (isinstance(node, ast.Expr) and isinstance(node.value, ast.Call)):
        return False
    func = node.value.func
    if not (isinstance(func, ast.Attribute) and func.attr in _FRAME_CALLS):
        return False
    owner = func.value
    return (
        (isinstance(owner, ast.Attribute) and owner.attr == "display")
        or (isinstance(owner, ast.Name) and owner.id == "display")
    )


def _already_async(tree):
    for node in ast.walk(tree):
        if isinstance(node, (ast.AsyncFunctionDef, ast.Await, ast.AsyncFor, ast.AsyncWith)):
            return True
        if isinstance(node, ast.Import) and any(a.name.split(".")[0] == "asyncio" for a in node.names):
            return True
        if isinstance(node, ast.ImportFrom) and (node.module or "").split(".")[0] == "asyncio":
            return True
    return False


def _functions_that_draw(tree):
    """Names of top-level functions that draw a frame, directly or through another."""
    defs = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}

    slow = {
        name for name, fn in defs.items()
        if any(_is_frame_call(n) for n in ast.walk(fn))
    }

    # A function that calls a slow function is slow too: it has to wait for it.
    changed = True
    while changed:
        changed = False
        for name, fn in defs.items():
            if name in slow:
                continue
            for n in ast.walk(fn):
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in slow:
                    slow.add(name)
                    changed = True
                    break
    return slow


class _Breathe(ast.NodeTransformer):
    def __init__(self, slow):
        self.slow = slow
        self.in_class = 0
        self.in_function = 0

    def visit_ClassDef(self, node):
        self.in_class += 1
        try:
            return self.generic_visit(node)
        finally:
            self.in_class -= 1

    def visit_FunctionDef(self, node):
        top_level = self.in_class == 0 and self.in_function == 0
        self.in_function += 1
        try:
            self.generic_visit(node)
        finally:
            self.in_function -= 1

        if top_level and node.name in self.slow:
            made = ast.AsyncFunctionDef(**{field: getattr(node, field) for field in node._fields})
            return ast.copy_location(made, node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id in self.slow:
            return ast.copy_location(ast.Await(value=node), node)
        return node

    def generic_visit(self, node):
        super().generic_visit(node)

        # After every frame is drawn, give the browser a turn.
        for field in ("body", "orelse", "finalbody"):
            statements = getattr(node, field, None)
            if not (isinstance(statements, list) and statements
                    and all(isinstance(s, ast.stmt) for s in statements)):
                continue

            rebuilt = []
            for statement in statements:
                rebuilt.append(statement)
                if _is_frame_call(statement):
                    pause = ast.Expr(value=ast.Await(value=ast.Call(
                        func=ast.Name(id="_s2c_pause", ctx=ast.Load()), args=[], keywords=[]
                    )))
                    rebuilt.append(ast.copy_location(pause, statement))
            setattr(node, field, rebuilt)

        return node


def _build(tree):
    """Compile the student's program, adding the pauses a browser needs."""
    if not _already_async(tree):
        try:
            rewritten = _Breathe(_functions_that_draw(tree)).visit(tree)
            ast.fix_missing_locations(rewritten)
            return compile(rewritten, STUDENT_FILE, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
        except Exception:    # noqa: BLE001
            # Something we cannot make breathe (a drawing method inside a class,
            # say). Run it as written: it works, it just cannot be stopped
            # mid-loop. A genuine mistake in the code is reported below, from
            # the plain compile, exactly as before.
            pass

    return compile(_source, STUDENT_FILE, "exec")


# -----------------------------------------------------------------------------
# Run the student's program.
# -----------------------------------------------------------------------------
_w.s2cStarted()


def _follow_window_size():
    """Make the stage the size of the window the program asks for.

    The canvas PyScript hands to pygame never changes size by itself, so
    set_mode((400, 300)) drew a small picture in the corner of a big black
    rectangle, and anything larger than 1280 x 720 was cut off. This reports
    every set_mode() to the page, which resizes the canvas to match.
    """
    try:
        import pygame
    except Exception:    # noqa: BLE001 - no pygame, nothing to follow
        return

    original = pygame.display.set_mode

    def set_mode(*args, **kwargs):
        surface = original(*args, **kwargs)
        try:
            width, height = surface.get_size()
            _w.s2cResize(width, height)
        except Exception:    # noqa: BLE001 - never let this get in the program's way
            pass
        return surface

    pygame.display.set_mode = set_mode


if str(_w.s2cMode) == "game":
    _follow_window_size()

_source = str(_w.s2cSource)
_source_lines = _source.splitlines()
_globals = {"__name__": "__main__", "__builtins__": builtins, "_s2c_pause": _s2c_pause}

try:
    # Parsing first gives the usual friendly report for a typo, on the right line.
    _tree = ast.parse(_source, STUDENT_FILE)
    _code = _build(_tree)
except SyntaxError as exc:          # a mistake in the code itself
    _report(exc)
    _w.s2cDone(False, type(exc).__name__)
else:
    try:
        _outcome = eval(_code, _globals)
        if asyncio.iscoroutine(_outcome):
            await _outcome
    except SystemExit:              # sys.exit() is a normal way to finish
        _w.s2cDone(True, "")
    except BaseException as exc:    # noqa: BLE001 - the point is to catch everything
        _report(exc)
        _w.s2cDone(False, type(exc).__name__)
    else:
        _w.s2cDone(True, "")
