/* eslint-disable */
// CommonJS helper to render DOT to SVG using viz.js with multiple fallbacks.
function tryRequire(name) {
  try {
    return require(name);
  } catch (_) {
    return null;
  }
}

async function renderDotWithViz(dotText) {
  // Try full.render.js
  try {
    const VizModule = tryRequire('viz.js');
    const Full = tryRequire('viz.js/full.render.js');
    if (VizModule && Full) {
      const Viz = VizModule.default || VizModule;
      const viz = new Viz({ render: Full.render, Module: Full.Module });
      if (viz.renderString) return await viz.renderString(dotText);
    }
  } catch (_) {
  }
  // Try lite.render.js
  try {
    const VizModule = tryRequire('viz.js');
    const Lite = tryRequire('viz.js/lite.render.js');
    if (VizModule && Lite) {
      const Viz = VizModule.default || VizModule;
      const viz = new Viz({ render: Lite.render, Module: Lite.Module });
      if (viz.renderString) return await viz.renderString(dotText);
    }
  } catch (_) {
  }
  // Try plain Viz
  try {
    const VizModule = tryRequire('viz.js');
    if (VizModule) {
      const Viz = VizModule.default || VizModule;
      const viz = new Viz();
      if (viz.renderString) return await viz.renderString(dotText);
    }
  } catch (_) {
  }
  return null;
}

exports.renderDotWithViz = renderDotWithViz;
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars, global-require */
