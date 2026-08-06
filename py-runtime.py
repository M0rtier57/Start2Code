# =============================================================================
# Start2Code — Python runtime harness.
#
# Loaded by public/runner.html and executed by PyScript. It wires print/input up
# to the console in the parent window, then runs the student's program (handed
# over as window.s2cSource) and turns any crash into a message a child can act
# on rather than a raw traceback.
# =============================================================================
import sys
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
# Run the student's program.
# -----------------------------------------------------------------------------
_w.s2cStarted()

_source = str(_w.s2cSource)
_source_lines = _source.splitlines()
_globals = {"__name__": "__main__", "__builtins__": builtins}

try:
    _code = compile(_source, STUDENT_FILE, "exec")
except SyntaxError as exc:          # a mistake in the code itself
    _report(exc)
    _w.s2cDone(False, type(exc).__name__)
else:
    try:
        exec(_code, _globals)
    except SystemExit:              # sys.exit() is a normal way to finish
        _w.s2cDone(True, "")
    except BaseException as exc:    # noqa: BLE001 - the point is to catch everything
        _report(exc)
        _w.s2cDone(False, type(exc).__name__)
    else:
        _w.s2cDone(True, "")
