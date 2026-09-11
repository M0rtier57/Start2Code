/* eslint-disable */
/**
 * Start2Code — Scratch host bridge.
 *
 * Mounts the prebuilt scratch-gui UMD bundle and exposes the VM to the parent
 * window over postMessage, so the React app can save, load and export projects
 * without ever bundling scratch-gui itself.
 *
 * Parent -> host:   { source: 's2c', type: 'load-sb3'  , buffer }
 *                   { source: 's2c', type: 'export-sb3', requestId }
 *                   { source: 's2c', type: 'new-project' }
 *                   { source: 's2c', type: 'green-flag' | 'stop-all' }
 *                   { source: 's2c', type: 'labels', labels }
 * Host   -> parent: { source: 's2c-scratch', type: 'ready' | 'dirty' | 'loaded'
 *                                                 | 'sb3' | 'error' | 'toast', ... }
 */
(function () {
  'use strict';

  var PARENT_TAG = 's2c';
  var SELF_TAG = 's2c-scratch';
  var boot = document.getElementById('boot');

  function post(message, transfer) {
    message.source = SELF_TAG;
    try {
      window.parent.postMessage(message, '*', transfer || []);
    } catch (e) {
      window.parent.postMessage(message, '*');
    }
  }

  function fail(message) {
    if (boot) {
      boot.classList.remove('hidden');
      boot.classList.add('failed');
      boot.querySelector('p').textContent = message;
    }
    post({ type: 'error', message: message });
  }

  var GUI = window.GUI;
  if (!GUI || !GUI.default || !GUI.AppStateHOC) {
    fail('The Scratch editor bundle could not be loaded. Check that public/scratch-gui.js is present.');
    return;
  }

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var vm = null;
  var dirty = false;

  // ---------------------------------------------------------------------------
  // VM wiring
  // ---------------------------------------------------------------------------
  function onVmInit(instance) {
    vm = instance;
    window.__s2cVm = vm;   // debug handle, dev only

    // PROJECT_CHANGED fires on every meaningful edit; it is what the official
    // editor uses to decide whether there is unsaved work.
    vm.on('PROJECT_CHANGED', function () {
      if (!dirty) {
        dirty = true;
        post({ type: 'dirty' });
      }
    });

    vm.on('PROJECT_RUN_START', function () { post({ type: 'running', running: true }); });
    vm.on('PROJECT_RUN_STOP', function () { post({ type: 'running', running: false }); });

    if (boot) boot.classList.add('hidden');
    post({ type: 'ready' });
  }

  function exportSb3(requestId) {
    if (!vm) return post({ type: 'error', requestId: requestId, message: 'Editor is not ready yet.' });

    vm.saveProjectSb3()
      .then(function (blob) { return blob.arrayBuffer(); })
      .then(function (buffer) {
        dirty = false;
        post({ type: 'sb3', requestId: requestId, buffer: buffer }, [buffer]);
      })
      .catch(function (err) {
        post({ type: 'error', requestId: requestId, message: String((err && err.message) || err) });
      });
  }

  function loadSb3(buffer) {
    if (!vm) return;
    vm.loadProject(buffer)
      .then(function () {
        dirty = false;
        post({ type: 'loaded' });
      })
      .catch(function (err) {
        post({ type: 'error', message: 'That project file could not be opened: ' + ((err && err.message) || err) });
      });
  }

  // A fresh project = reload the frame; the GUI has no clean "reset" API and
  // this is what the real editor effectively does for File > New.
  function newProject() {
    dirty = false;
    window.location.reload();
  }

  // ---------------------------------------------------------------------------
  // Blocks as pictures
  //
  // Right-clicking a block adds two entries to Scratch's own menu, so the
  // familiar Duplicate / Add Comment / Delete stay exactly where they were.
  // The picture is the block plus everything joined below it — a whole script.
  //
  // Overwritten by the parent as soon as it knows which language is on.
  // ---------------------------------------------------------------------------
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XLINK_NS = 'http://www.w3.org/1999/xlink';

  var labels = {
    copy: 'Copy as image',
    save: 'Save as image',
    copied: 'Copied — paste it wherever you like.',
    saved: 'The image has been downloaded.',
    fellBack: 'This browser will not copy images, so it was downloaded instead.',
    failed: 'The image could not be created.',
    filename: 'blocks.png'
  };

  var installed = false;

  function installBlockExport() {
    if (installed) return true;

    var proto = blockPrototype();
    if (!proto || !proto.showContextMenu_) return false;

    var showContextMenu = proto.showContextMenu_;

    // Scratch assembles the menu inside showContextMenu_ and offers exactly one
    // way in: customContextMenu, called with the list just before it is shown.
    // Blocks that define their own — procedures, variables — keep it; ours runs
    // after theirs, so nothing they add is lost.
    proto.showContextMenu_ = function (event) {
      var block = this;
      var own = Object.prototype.hasOwnProperty.call(this, 'customContextMenu')
        ? this.customContextMenu
        : null;

      this.customContextMenu = function (options) {
        if (own) own.call(block, options);
        // Not in the palette: those blocks are rebuilt constantly, and
        // right-clicking one shows no menu today.
        if (!block.isInFlyout) {
          options.push(exportOption(labels.copy, block, 'copy'));
          options.push(exportOption(labels.save, block, 'save'));
        }
      };

      try {
        showContextMenu.call(this, event);
      } finally {
        if (own) this.customContextMenu = own;
        else delete this.customContextMenu;
      }
    };

    installed = true;
    return true;
  }

  /**
   * The bundle puts only a handful of names on window.Blockly and BlockSvg is
   * not one of them. Every block in the palette is one, though, so the
   * prototype is reachable through the workspace instead.
   */
  function blockPrototype() {
    var Blockly = window.Blockly;
    if (!Blockly || !Blockly.getMainWorkspace) return null;

    var workspace = Blockly.getMainWorkspace();
    var flyout = workspace && workspace.getFlyout && workspace.getFlyout();
    var palette = flyout && flyout.getWorkspace && flyout.getWorkspace();
    var blocks = palette && palette.getTopBlocks ? palette.getTopBlocks(false) : [];

    return blocks.length ? Object.getPrototypeOf(blocks[0]) : null;
  }

  function exportOption(text, block, mode) {
    return {
      text: text,
      enabled: true,
      callback: function () { exportBlock(block, mode); }
    };
  }

  function exportBlock(block, mode) {
    var rendering = blockToBlob(block, 2);

    if (mode === 'copy') {
      // The blob is handed over as a promise so Safari, which only allows a
      // clipboard write in the same turn as the click, still accepts it.
      copyImage(rendering).then(function (copied) {
        if (copied) return notify('success', labels.copied);
        return rendering.then(function (blob) {
          saveImage(blob);
          notify('success', labels.fellBack);
        });
      }).catch(function (err) { notify('error', reason(err)); });
      return;
    }

    rendering.then(function (blob) {
      saveImage(blob);
      notify('success', labels.saved);
    }).catch(function (err) { notify('error', reason(err)); });
  }

  /** The block, its inputs and every block attached under it, as a PNG. */
  function blockToBlob(block, scale) {
    var root = block.getSvgRoot && block.getSvgRoot();
    if (!root) return Promise.reject(new Error(labels.failed));

    var box = root.getBBox();
    var margin = 6;
    var width = box.width + margin * 2;
    var height = box.height + margin * 2;

    var clone = root.cloneNode(true);
    // The group's transform places it in the workspace; the viewBox below
    // does the framing instead. Editor-only decoration goes as well.
    clone.removeAttribute('transform');
    stripClass(clone, 'blocklySelected');
    stripClass(clone, 'blocklyDragging');
    stripClass(clone, 'blocklyGlowingStack');

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('xmlns:xlink', XLINK_NS);
    svg.setAttribute('width', Math.ceil(width * scale));
    svg.setAttribute('height', Math.ceil(height * scale));
    svg.setAttribute('viewBox', [box.x - margin, box.y - margin, width, height].join(' '));

    var style = document.createElementNS(SVG_NS, 'style');
    style.textContent = blocklyCss();
    svg.appendChild(style);
    svg.appendChild(clone);

    return inlineImages(clone).then(function () {
      return rasterise(svg, Math.ceil(width * scale), Math.ceil(height * scale));
    });
  }

  /**
   * Blockly colours the shapes with attributes but the text with a stylesheet,
   * so the rules have to travel with the picture or every label comes out
   * black and in the wrong font.
   */
  function blocklyCss() {
    var css = '';
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules;
      try {
        rules = document.styleSheets[i].cssRules;
      } catch (e) {
        continue;   // a stylesheet from another origin cannot be read
      }
      if (!rules) continue;

      for (var j = 0; j < rules.length; j++) {
        var text = rules[j].cssText || '';
        if (text.indexOf('.blockly') !== -1) css += text + '\n';
      }
    }
    return css;
  }

  /**
   * An <image> pointing at a file cannot load once the drawing is a data URL,
   * so the green flag, the loop arrow and the dropdown carets are fetched and
   * embedded first.
   */
  function inlineImages(root) {
    var nodes = root.querySelectorAll ? root.querySelectorAll('image') : [];
    var jobs = [];

    for (var i = 0; i < nodes.length; i++) jobs.push(inlineImage(nodes[i]));
    return Promise.all(jobs);
  }

  function inlineImage(node) {
    var href = node.getAttributeNS(XLINK_NS, 'href') || node.getAttribute('href') || '';
    if (!href || href.indexOf('data:') === 0) return Promise.resolve();

    return fetch(href)
      .then(function (response) { return response.blob(); })
      .then(readAsDataUrl)
      .then(function (url) {
        node.setAttributeNS(XLINK_NS, 'href', url);
        node.setAttribute('href', url);
      })
      .catch(function () {
        // A missing icon draws as a broken image; leaving it out is tidier.
        if (node.parentNode) node.parentNode.removeChild(node);
      });
  }

  function rasterise(svg, width, height) {
    var xml = new XMLSerializer().serializeToString(svg);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

    return new Promise(function (resolve, reject) {
      var image = new Image();

      image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error(labels.failed));
        }, 'image/png');
      };

      image.onerror = function () { reject(new Error(labels.failed)); };
      image.src = url;
    });
  }

  function copyImage(blobPromise) {
    var Item = window.ClipboardItem;
    if (!navigator.clipboard || !navigator.clipboard.write || typeof Item !== 'function') {
      return Promise.resolve(false);
    }

    try {
      return navigator.clipboard.write([new Item({ 'image/png': blobPromise })])
        .then(function () { return true; }, function () { return false; });
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function saveImage(blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = labels.filename;
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function stripClass(root, name) {
    if (root.classList) root.classList.remove(name);
    var found = root.querySelectorAll ? root.querySelectorAll('.' + name) : [];
    for (var i = 0; i < found.length; i++) found[i].classList.remove(name);
  }

  function readAsDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error(labels.failed)); };
      reader.readAsDataURL(blob);
    });
  }

  function reason(err) {
    return String((err && err.message) || labels.failed);
  }

  /** The toast belongs to the app around this frame, not to this frame. */
  function notify(level, message) {
    post({ type: 'toast', level: level, message: message });
  }

  // The palette is filled some way into start-up, so the hook is installed on
  // the first attempt that finds it rather than at load time.
  (function waitForBlocks(attempt) {
    if (installBlockExport() || attempt > 120) return;
    setTimeout(function () { waitForBlocks(attempt + 1); }, 250);
  })(0);

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== PARENT_TAG) return;

    switch (data.type) {
      case 'export-sb3':  exportSb3(data.requestId); break;
      case 'load-sb3':    loadSb3(data.buffer); break;
      case 'new-project': newProject(); break;
      case 'green-flag':  if (vm) vm.greenFlag(); break;
      case 'stop-all':    if (vm) vm.stopAll(); break;
      case 'turbo':       if (vm) vm.setTurboMode(!!data.value); break;
      case 'labels':      Object.assign(labels, data.labels || {}); break;
    }
  });

  window.addEventListener('error', function (e) {
    post({ type: 'error', message: String((e.error && e.error.message) || e.message) });
  });

  // ---------------------------------------------------------------------------
  // Mount
  // ---------------------------------------------------------------------------
  var appEl = document.getElementById('app');
  if (GUI.setAppElement) GUI.setAppElement(appEl);

  var Wrapped = GUI.AppStateHOC(GUI.default);

  var element = React.createElement(Wrapped, {
    // Assets for the default project and the sprite/backdrop libraries.
    assetHost: 'https://assets.scratch.mit.edu',
    projectHost: 'https://projects.scratch.mit.edu',
    projectId: 0,

    // Saving, sharing and the backpack all belong to scratch.mit.edu accounts;
    // Start2Code provides its own toolbar instead.
    canSave: false,
    canCreateNew: false,
    canRemix: false,
    canShare: false,
    canCreateCopy: false,
    enableCommunity: false,
    showComingSoon: true,
    backpackVisible: false,
    canEditTitle: false,

    onVmInit: onVmInit
  });

  try {
    if (ReactDOM.createRoot) {
      ReactDOM.createRoot(appEl).render(element);
    } else {
      ReactDOM.render(element, appEl);
    }
  } catch (err) {
    fail('The Scratch editor failed to start: ' + ((err && err.message) || err));
  }
})();
