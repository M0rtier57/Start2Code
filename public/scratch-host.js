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
 * Host   -> parent: { source: 's2c-scratch', type: 'ready' | 'dirty' | 'loaded'
 *                                                 | 'sb3' | 'error' , ... }
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

    // Handy when debugging what the analyser sees: open this frame's console
    // and inspect __s2cVm. Nothing in the app depends on it.
    window.__s2cVm = vm;

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

  /**
   * Describe what the child has actually built, so lesson steps can tick
   * themselves.
   *
   * Every block in the VM carries an opcode ('control_forever',
   * 'event_whenflagclicked', …). Counting those, plus recording which block
   * sits inside which, is enough to answer questions like "did they put a move
   * block inside a repeat?" — and it reads the real project rather than
   * guessing from the picture on screen.
   */
  function analyse(requestId) {
    if (!vm) return post({ type: 'error', requestId: requestId, message: 'Editor is not ready yet.' });

    var blocks = {};     // opcode -> how many
    var inside = {};     // "childOpcode<parentOpcode" -> how many
    var variables = [];
    var sprites = 0;

    try {
      vm.runtime.targets.forEach(function (target) {
        // Clones share their blocks with the original; skip them.
        if (!target.isOriginal) return;
        if (!target.isStage) sprites += 1;

        Object.keys(target.variables || {}).forEach(function (id) {
          var name = target.variables[id].name;
          if (name && variables.indexOf(name) === -1) variables.push(name);
        });

        var all = (target.blocks && target.blocks._blocks) || {};
        Object.keys(all).forEach(function (id) {
          var block = all[id];
          if (!block || !block.opcode) return;
          blocks[block.opcode] = (blocks[block.opcode] || 0) + 1;

          // Walk up the chain of parents so "inside a forever loop" is still
          // true when there are blocks stacked in between.
          var seen = 0;
          var parentId = block.parent;
          while (parentId && seen < 50) {
            var parent = all[parentId];
            if (!parent) break;
            if (parent.opcode && parent.opcode !== block.opcode) {
              var key = block.opcode + '<' + parent.opcode;
              inside[key] = (inside[key] || 0) + 1;
            }
            parentId = parent.parent;
            seen += 1;
          }
        });
      });

      post({
        type: 'facts',
        requestId: requestId,
        facts: { kind: 'scratch', blocks: blocks, inside: inside, variables: variables, sprites: sprites }
      });
    } catch (err) {
      post({ type: 'error', requestId: requestId, message: String((err && err.message) || err) });
    }
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

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source !== PARENT_TAG) return;

    switch (data.type) {
      case 'export-sb3':  exportSb3(data.requestId); break;
      case 'analyse':     analyse(data.requestId); break;
      case 'load-sb3':    loadSb3(data.buffer); break;
      case 'new-project': newProject(); break;
      case 'green-flag':  if (vm) vm.greenFlag(); break;
      case 'stop-all':    if (vm) vm.stopAll(); break;
      case 'turbo':       if (vm) vm.setTurboMode(!!data.value); break;
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
