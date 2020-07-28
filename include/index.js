
export { stop, playpause, speak };

const { speechSynthesis, SpeechSynthesisUtterance } = window;

const texttospeak = document.getElementById('texttospeak');
const textbeingspoken = document.getElementById('textbeingspoken');
const marker = document.getElementById('marker');
const LOG = document.getElementById('log');

const range = document.createRange();

let speechtext;
let firstBoundary;

let voicesFiltered = [];
function populateVoiceList () {
  const VOICES = speechSynthesis.getVoices();

  const langFilter = param(/[?&]filter=(\w+)/);
  const langRex = langFilter ? new RegExp('^' + langFilter) : null;
  console.warn('Voice language filter:', langRex);

  const selectElm = document.querySelector('#voice');
  selectElm.innerHTML = '';

  voicesFiltered = langRex ? VOICES.filter(vox => langRex.test(vox.lang)) : VOICES;

  const voicesArray = [];

  voicesFiltered.forEach(voice => {
    const option = document.createElement('option');
    option.innerHTML = `${voice.name} (${voice.lang})`;
    option.setAttribute('value', voice.voiceURI);
    option.voice = voice;

    if (voice.default) { option.selected = true; }

    selectElm.appendChild(option);

    voicesArray.push(plainObject(voice));
  });

  console.warn('Filtered voices:', voicesFiltered);

  LOG.textContent += `Count of voices :~ ${VOICES.length}\n`;
  LOG.textContent += `Filtered voices :~ ${voicesFiltered.length}\n`;
  LOG.textContent += JSON.stringify(voicesArray, null, 2);
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

function stop () {
  speechSynthesis.cancel();
}

function playpause () {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
  } else { speechSynthesis.pause(); }
}

function speak () {
  speechtext = texttospeak.value;
  firstBoundary = true;
  textbeingspoken.textContent = speechtext;

  const utterance = new SpeechSynthesisUtterance(speechtext);
  const voiceIdx = document.getElementById('voice').selectedIndex;
  utterance.voice = voicesFiltered[voiceIdx]; // Was: voices.
  utterance.volume = document.getElementById('volume').value;
  utterance.pitch = document.getElementById('pitch').value;
  const rate = document.getElementById('rate').value;
  utterance.rate = Math.pow(Math.abs(rate) + 1, rate < 0 ? -1 : 1);

  utterance.addEventListener('start', function () {
    marker.classList.remove('animate');
    document.body.classList.add('speaking');
  });
  utterance.addEventListener('start', handleSpeechEvent);
  utterance.addEventListener('end', handleSpeechEvent);
  utterance.addEventListener('error', handleSpeechEvent);
  utterance.addEventListener('boundary', handleSpeechEvent);
  utterance.addEventListener('pause', handleSpeechEvent);
  utterance.addEventListener('resume', handleSpeechEvent);

  console.warn('Utterance:', utterance, speechSynthesis);

  speechSynthesis.speak(utterance);
}

function handleSpeechEvent (ev) {
  console.log('Speech Event:', ev);

  switch (ev.type) {
    case 'start':
      marker.classList.remove('animate');
      document.body.classList.add('speaking');
      break;
    case 'end':
    case 'endEvent':
    case 'error':
      document.body.classList.remove('speaking');
      marker.classList.remove('moved');
      break;
    case 'boundary':
    {
      if (ev.name !== 'word') { break; }

      const substr = speechtext.slice(ev.charIndex);
      const regex = /\S+/g;
      const res = regex.exec(substr);
      // console.warn('Marker:', substr, res, marker, range);

      if (!res) return;

      const startOffset = res.index + ev.charIndex;
      const endOffset = regex.lastIndex + ev.charIndex;
      range.setStart(textbeingspoken.firstChild, startOffset);
      range.setEnd(textbeingspoken.firstChild, endOffset);
      const rect = range.getBoundingClientRect();
      let delta = 0;
      // do I need to scroll?
      const parentRect = textbeingspoken.getBoundingClientRect();
      if (rect.bottom > parentRect.bottom) {
        delta = rect.bottom - parentRect.bottom;
      }
      if (rect.top < parentRect.top) {
        delta = rect.top - parentRect.top;
      }

      textbeingspoken.scrollTop += delta;
      texttospeak.scrollTop = textbeingspoken.scrollTop;

      marker.style.top = `${rect.top - delta - 1}px`;
      marker.style.left = `${rect.left - 1}px`;
      marker.style.width = `${rect.width + 1}px`;
      marker.style.height = `${rect.height + 1}px`;
      marker.classList.add('moved');

      if (firstBoundary) {
        firstBoundary = false;
        marker.classList.add('animate');
      }

      // console.warn('Marker (2):', rect, delta);
      break;
    }
    default:
      break;
  }
}

function param (regex, def = null) {
  const matches = window.location.search.match(regex);
  return matches ? matches[1] : def;
}

// ---------------------------------

// Include non-inumerable / inherited properties?
// https://medium.com/javascript-in-plain-english/5-easy-ways-to-iterate-over-javascript-object-properties-913d048e827f#
function plainObject (obj) {
  const result = {};
  /* Object.keys(obj).forEach(key => result[ key ] = obj[ key ]); */
  for (const key in obj) { result[key] = obj[key]; }
  return result;
}

const NAV = window.navigator;

console.warn('User agent :~', NAV.userAgent);
console.warn(NAV);

LOG.textContent = `${NAV.userAgent}\n\n`;
