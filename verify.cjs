const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function verify(withGSAP, fps = 60) {
  const events = {}, windowEvents = {}, frames = [];
  let options, playhead, clock = 100;
  const video = {
    dataset: { src: 'controller-scroll-60fps.mp4', fps: String(fps) }, readyState: 0,
    duration: fps === 60 ? 603 / 60 : 241 / 24, currentTime: 0, seeking: false,
    pause() { this.paused = true; }, load() { this.loaded = true; },
    addEventListener(name, fn) { events[name] = fn; },
  };
  const scene = {
    classList: { add() {}, remove() {} }, style: { setProperty() {} },
    getBoundingClientRect: () => ({ top: 0 }),
  };
  const nodes = {
    '.scroll-scene': scene, '.precision': { clientHeight: 800, addEventListener() {} },
    '#controller-video': video, '.media-status': {}, '.scroll-hint': { style: {} },
  };
  const gsap = {
    registerPlugin() {}, to(p, config) {
      playhead = p; options = config;
      return { scrollTrigger: { kill() {} }, kill() {} };
    },
  };
  const ScrollTrigger = { config() {}, refresh() {} };
  const window = {
    scrollY: 0, addEventListener(name, fn) { windowEvents[name] = fn; }, removeEventListener() {},
    ...(withGSAP ? { gsap, ScrollTrigger } : {}),
  };
  vm.runInNewContext(fs.readFileSync('script.js', 'utf8'), {
    window, document: { querySelector: s => nodes[s] }, location: { protocol: 'file:' },
    gsap, ScrollTrigger, performance: { now: () => clock },
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
  });
  const flush = () => { for (let i = 0; frames.length && i < 10; i++) frames.shift()(); };
  assert.equal(video.loaded, true);
  assert.equal(video.paused, true);
  assert.equal(options, undefined, 'wait for metadata');
  video.readyState = 1;
  events.loadedmetadata(); flush();
  assert.equal(video.currentTime, 0);
  const move = progress => {
    if (withGSAP) { playhead.progress = progress; options.onUpdate(); }
    else { window.scrollY = progress * 2800; windowEvents.scroll(); }
    flush();
  };
  move(.5);
  assert(video.currentTime > 4 && video.currentTime < 6, 'seek with metadata only');
  video.seeking = true;
  move(.8);
  assert(video.currentTime < 6, 'do not interrupt active seek');
  move(.2);
  video.seeking = false;
  events.seeked(); flush();
  assert(video.currentTime < 3, 'use latest pending target when reversing');
  video.seeking = true;
  clock += 1500;
  move(.7);
  assert(video.currentTime > 6, 'recover an interrupted seek');
  video.seeking = false;
  const finalFrame = (Math.round(video.duration * fps) - 1) / fps;
  move(1); assert.equal(video.currentTime, finalFrame, 'final frame');
  flush(); assert.equal(video.currentTime, finalFrame, 'hold while idle');
  move(0); assert.equal(video.currentTime, 0, 'return to first frame');
  if (withGSAP) {
    assert.equal(options.scrollTrigger.scrub, true);
    assert.equal(options.scrollTrigger.pin, true);
  }
  assert.equal(video.paused, true);
  console.log('PASS: ' + (withGSAP ? 'GSAP' : 'native fallback') + ' — metadata, forward/reverse, seek recovery, endpoints, paused state');
}
verify(true);
verify(false);
verify(true, 24);
