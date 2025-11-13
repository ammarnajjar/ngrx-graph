// CommonJS helper to render DOT to SVG using viz.js with multiple fallbacks.
const fs = require('fs');
function tryRequire(name) {
  try {
    return require(name);
  } catch (e) {
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
  } catch (e) {
    // ignore
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
  } catch (e) {
    // ignore
  }
  // Try plain Viz
  try {
    const VizModule = tryRequire('viz.js');
    if (VizModule) {
      const Viz = VizModule.default || VizModule;
      const viz = new Viz();
      if (viz.renderString) return await viz.renderString(dotText);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

module.exports = { renderDotWithViz };
