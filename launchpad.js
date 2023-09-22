const targetDeviceName = "Launchpad Mini MK3 LPMiniMK3 DAW In";
const dropTargets = document.querySelectorAll('td[data-drop]');
const tdNodes = document.querySelectorAll('td[data-id]');
const tdNodesMap = new Map();
const noteNumbers = [];
let targetMidiDevice = null;


let midi = null; // Global MIDIAccess object
let audios = {}; // Object for storing id => audio bindings
let padsColors = {}; // Object for storing id => color bindings

// Colors
let padColorRed = 72;
let padColorGreen = 64;
let padColorBlue = 79;
let padColorPink = 107;
let padColorYellow = 74;
let padColorCyan = 78;
let padColorOrange = 84;
let padColorGray = 0;

let padChannelControlButtonStatic = 176;
let padChannelControlButtonStaticBlink = 177;
let padChannelControlButtonPulse = 178;
let padChannelStatic = 144;
let padChannelBlink = 145; // Will blink from static color to blink color
let padChannelPulse = 146;

let padLogoID = 99;
let padStopID = 19;


let colorMap = {
    [padColorRed]: 'red',
    [padColorGreen]: 'green',
    [padColorBlue]: 'blue',
    [padColorPink]: 'pink',
    [padColorYellow]: 'yellow',
    [padColorCyan]: 'cyan',
    [padColorOrange]: 'orange',
    [padColorGray]: 'gray',
};


const selectElement = document.getElementById("sampleSelect");
const closeButton = document.getElementById("close-button");
const recordToggle = document.getElementById("record-toggle");
const preloadSamplesToggle = document.getElementById("preload-samples-toggle");
const centeredBox = document.querySelector(".centered-box");
const overlay = document.querySelector(".overlay");

function ShowOverlay() {
    centeredBox.style.display = "block";
    overlay.style.display = "block";
}

function HideOverlay() {
    centeredBox.style.display = "none";
    overlay.style.display = "none";
}

selectElement.addEventListener('change', (event) => {
    LoadSamples();
});

closeButton.addEventListener("click", function () {
    // Закрываем центрированный div и оверлей
    centeredBox.style.display = "none";
    overlay.style.display = "none";
});

dropTargets.forEach(function (dropTarget) {
    dropTarget.addEventListener('dragover', (e) => {
        e.preventDefault();

        dropTarget.classList.add('highlight');

        let dataDrop = dropTarget.getAttribute('data-drop');
        if (dataDrop !== 'true') {
            dropTarget.classList.add('highlight_wrong');
        }

    });

    dropTarget.addEventListener('dragleave', () => {
        dropTarget.classList.remove('highlight');
        dropTarget.classList.remove('highlight_wrong');
    });

    dropTarget.addEventListener('drop', (e) => {
        handleDrop(dropTarget, e);
    });
});

tdNodes.forEach(function (td) {
    let dataID = td.getAttribute('data-id')
    tdNodesMap.set(dataID, td);

    td.addEventListener('click', function () {
        Trigger(dataID);
    });
});

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({sysex: true}).then(function (midiAccess) {
        midi = midiAccess; // save midi object to the global scope

        let midiOutputsIterator = midi.outputs.values();
        for (let output = midiOutputsIterator.next(); output && !output.done; output = midiOutputsIterator.next()) {
            if (output.value.name === targetDeviceName) {
                targetMidiDevice = output.value;
                console.log('found', output.value.name);
            }
        }

        // midiAccess.outputs.forEach(function (output) {
        //     console.log(output.name, output.manufacturer, output.state);
        //     console.log(output);
        // });

        SetLogoColor(padColorCyan);
        SetStopColor(padColorRed);

        let statusDiv = document.querySelector('#status');

        if (targetMidiDevice === null) {
            statusDiv.innerHTML = 'MIDI-device not found';
            return;
        }
        statusDiv.innerHTML = 'MIDI-device: ' + targetMidiDevice.name;

        // Enable session mode
        targetMidiDevice.send([240, 0, 32, 41, 2, 13, 16, 1, 247]);
        // Switch device to session mode
        targetMidiDevice.send([240, 0, 32, 41, 2, 13, 0, 0, 247]);


        const rows = 8;
        const cols = 8;
        let startValue = 81;

        // walk through all buttons and turn off
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let cell = startValue - row * 10 + col;
                // SetColor(cell, padColorGray);
                targetMidiDevice.send([padChannelStatic, cell, padColorGray]);
            }
        }

        // walk through all buttons and turn on orange color
        // for (let row = 0; row < rows; row++) {
        //     for (let col = 0; col < cols; col++) {
        //         const cell = startValue - row * 10 + col;
        //         SetColor(cell, padColorOrange);
        //     }
        // }


        let inputs = midiAccess.inputs.values();
        for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
            input.value.onmidimessage = function (event) {
                let type = event.data[0]; // Message type of MIDI event
                let noteNumber = event.data[1]; // Note number
                let velocity = event.data[2]; // 127 pressed, 0 released
                // console.log(type, noteNumber, velocity);

                console.log(noteNumber, velocity);
                let td = tdNodesMap.get(noteNumber.toString());
                if (velocity > 0) {
                    if (td) {
                        switch (type) {
                            case 176:
                                // control button
                                Trigger(noteNumber);
                                break;
                            case 144:
                                // pad button
                                Trigger(noteNumber);
                                break;
                        }
                    }
                } else {
                    if (td) {
                        switch (type) {
                            case 176:
                                // control button
                                // TriggerRelease(noteNumber);
                                break;
                            case 144:
                                // pad button
                                TriggerRelease(noteNumber);
                                break;
                        }
                    }
                }
            };
        }

    });
}

// on document ready and loaded
document.addEventListener('DOMContentLoaded', function () {
    LoadSamples()
});


function Trigger(id) {
    let td = tdNodesMap.get(id.toString());
    let dataAction = td.getAttribute('data-action');
    switch (dataAction) {
        case 'play':
            Play(td.getAttribute('data-url'), id);
            break;
        case 'empty':
            if (recordToggle.checked) {
                if (recording) {
                    mediaRecorder.stop();
                    recording = false;
                } else {
                    mediaRecorder.start();
                    recording = true;
                    recordingID = id;
                    SetColor(id, padColorRed, padChannelPulse);
                    startTime = new Date().getTime();
                    td.textContent = id + ' ' + 'Recording...';
                }
            } else {
                WrongButton(id);
            }
            break;
        case 'stop':
            StopAll();
            break;
    }
}

function TriggerRelease(id) {
    let td = tdNodesMap.get(id.toString());
    let dataAction = td.getAttribute('data-action');
    switch (dataAction) {
        case 'empty':
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                recording = false;
            }
            break;
    }
}


// Set up the AudioContext.
const audioCtx = new AudioContext();

// Top-level variable keeps track of whether we are recording or not.
let recording = false;
let recordingID = 0;
let mediaRecorder = null;
let startTime = 0;
// Ask user for access to the microphone.
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({"audio": true}).then((stream) => {
        // Instantiate the media recorder.
        mediaRecorder = new MediaRecorder(stream);
        // Create a buffer to store the incoming data.
        let chunks = [];
        mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
        }
        // When you stop the recorder, create a empty audio clip.
        mediaRecorder.onstop = (event) => {
            const blob = new Blob(chunks, {"type": "audio/ogg; codecs=opus"});
            const audioUrl = URL.createObjectURL(blob);

            // detect seconds to variable
            let seconds = Math.floor((new Date().getTime() - startTime) / 1000);

            let td = tdNodesMap.get(recordingID.toString());
            td.setAttribute('data-url', audioUrl);
            td.setAttribute('data-action', 'play');
            td.textContent = recordingID + ' ' + 'Rec: ' + seconds + 's';
            SetColor(recordingID, padColorOrange);
            // Clear the `chunks` buffer so that you can record again.
            chunks = [];
        };
    }).catch((err) => {
        // Throw alert when the browser is unable to access the microphone.
        alert("Oh no! Your browser cannot access your computer's microphone.");
    });
} else {
    // Throw alert when the browser cannot access any media devices.
    alert("Oh no! Your browser cannot access your computer's microphone. Please update your browser.");
}

function Play(file, noteNumber) {
    let playAsync = document.querySelectorAll('input[id="play-async"]');
    if (!playAsync[0].checked) {
        StopAll();
    }

    // Check if audio for noteNumber exists
    if (audios[noteNumber]) {
        // If exists, stop it and remove event handler "ended"
        audios[noteNumber].pause();
        audios[noteNumber].currentTime = 0;
        audios[noteNumber].removeEventListener('ended', audioEndedHandler);
    }

    if (file !== '') {
        audios[noteNumber] = new Audio(file);

        // Create closure for passing noteNumber
        const endedHandlerWithNote = () => {
            audioEndedHandler(noteNumber);
        };

        // Add event handler "ended" for tracking end of playing
        audios[noteNumber].addEventListener('ended', endedHandlerWithNote);
        noteNumbers.push(noteNumber); // Add noteNumber to array noteNumbers

        const playPromise = audios[noteNumber].play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    // Sound is playing successfully after user interaction
                })
                .catch(error => {
                    // Error play sound, for example, because of user permission
                    console.error('Error play sound', error);
                    WrongButton(noteNumber);
                });
        }
        let targetCell = tdNodesMap.get(noteNumber.toString());
        if (!padsColors[noteNumber]) {
            padsColors[noteNumber] = targetCell.style.backgroundColor;
        }
        SetColor(noteNumber, padColorCyan, padChannelPulse);
        targetCell.classList.add('pulsating-cyan');
    }
}

function WrongButton(noteNumber) {
    let targetCell = tdNodesMap.get(noteNumber.toString());
    let previousColor = targetCell.style.backgroundColor;
    Blink(noteNumber, padColorRed, padColorGray, 3);

    setTimeout(function () {
        let previousColorPad = findKeyByValue(previousColor, colorMap);
        targetCell.style.backgroundColor = previousColor;
        SetColor(noteNumber, previousColorPad);
    }, 400);
}

function Blink(noteNumber, color1, color2, count) {
    if (count === 0) {
        return;
    }

    SetColor(noteNumber, color1);
    setTimeout(function () {
        SetColor(noteNumber, color2);
        setTimeout(function () {
            Blink(noteNumber, color1, color2, count - 1);
        }, 50);
    }, 50);
}

function StopAll() {

    let disableButtons = document.querySelectorAll('input[id="disable-buttons"]');

    // Remove all noteNumbers from array and call SetColor for each
    while (noteNumbers.length > 0) {
        const noteNumber = noteNumbers.pop();

        let targetCell = tdNodesMap.get(noteNumber.toString());
        targetCell.classList.remove('pulsating-cyan');

        // stop audio and remove event handler "ended"
        audios[noteNumber].pause();
        audios[noteNumber].currentTime = 0;
        audios[noteNumber].removeEventListener('ended', audioEndedHandler);

        if (disableButtons[0].checked) {
            SetColor(noteNumber, padColorGray);
        } else {
            let previousColorPad = findKeyByValue(padsColors[noteNumber], colorMap);
            if (previousColorPad) {
                SetColor(noteNumber, previousColorPad);
            } else {
                SetColor(noteNumber, padColorOrange);
            }
        }
    }
}

// Handler for audio "ended" event
function audioEndedHandler(noteNumber) {
    let disableButtons = document.querySelectorAll('input[id="disable-buttons"]');

    if (disableButtons[0].checked) {
        SetColor(noteNumber, padColorGray);
    } else {
        let previousColorPad = findKeyByValue(padsColors[noteNumber], colorMap);
        if (previousColorPad) {
            SetColor(noteNumber, previousColorPad);
        } else {
            SetColor(noteNumber, padColorOrange);
        }
    }

    // Remove noteNumber from array noteNumbers
    const index = noteNumbers.indexOf(noteNumber);
    if (index !== -1) {
        noteNumbers.splice(index, 1);
    }
    let targetCell = tdNodesMap.get(noteNumber.toString());
    targetCell.classList.remove('pulsating-cyan');
}

async function SetColor(noteNumber, color, defaultChannel = padChannelStatic) {
    let channel = defaultChannel
    if (targetMidiDevice) {

        // let channel = padChannelStatic
        if (noteNumber > 90) {
            channel = padChannelControlButtonStatic;
        }
        // if notenumber ending with 9 - it's control button
        if (noteNumber % 10 === 9) {
            channel = padChannelControlButtonStatic;
        }

        targetMidiDevice.send([channel, noteNumber, color]);
        targetMidiDevice.onmidimessageerror = function (error) {
            console.error("Error on midi send:", error);
        };
    }
    // check if cell node exists
    if (!tdNodesMap.has(noteNumber.toString())) {
        return;
    }

    let targetCell = tdNodesMap.get(noteNumber.toString());
    targetCell.style.backgroundColor = colorMap[color];
}

function SetLogoColor(color) {
    if (targetMidiDevice) {
        targetMidiDevice.send([padChannelControlButtonPulse, padLogoID, color]);
    }
    let targetCell = tdNodesMap.get(padLogoID.toString());
    targetCell.style.backgroundColor = colorMap[color];
}

function SetStopColor(color) {
    if (targetMidiDevice) {
        targetMidiDevice.send([padChannelControlButtonStatic, padStopID, color]);
    }
    let targetCell = tdNodesMap.get(padStopID.toString());
    targetCell.style.backgroundColor = colorMap[color];
}

function handleDrop(dropTarget, e) {
    e.preventDefault();
    dropTarget.classList.remove('highlight');
    dropTarget.classList.remove('highlight_wrong');
    let dataDrop = dropTarget.getAttribute('data-drop');
    if (dataDrop !== 'true') {
        return;
    }

    const files = e.dataTransfer.files;

    if (files.length > 0) {
        const fileName = files[0].name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        if (fileExtension === 'ogg' || fileExtension === 'wav' || fileExtension === 'mp3') {
            const base64DataUrl = URL.createObjectURL(files[0]);
            dropTarget.setAttribute('data-url', base64DataUrl);
            dropTarget.setAttribute('data-action', 'play');
            dropTargetID = dropTarget.getAttribute('data-id');
            SetColor(dropTargetID, padColorOrange);
            dropTarget.textContent = dropTargetID + ' ' + fileName;
        } else {
            alert(`File ${fileName} has wrong extension. Allowed extensions: ogg, wav, mp3`);
        }
    }
}

function findKeyByValue(value, obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === value) {
            return key;
        }
    }
    return null; // return null if not found
}

let preloadAnimation = true;

function ClearTable() {
    // reset all cells in table 8x8
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = 81 - row * 10 + col;
            SetColor(cell, padColorGray);
            let targetCell = tdNodesMap.get(cell.toString());
            targetCell.textContent = cell;
            targetCell.setAttribute('data-url', '');
            targetCell.setAttribute('data-action', 'empty');
        }
    }
}

async function Preloader() {
    try {
        const numbers = [63, 53, 43, 33, 34, 35, 36, 46, 56, 66, 65, 64];
        // const numbers = [63, 54, 45, 36, 27, 37, 47, 57, 67, 66, 55 ,44,33,22,32,42,52,62];

        while (preloadAnimation) {
            for (let i = 0; i < numbers.length; i++) {
                const number = numbers[i];
                await SetColor(number, padColorGreen);
                await new Promise(resolve => setTimeout(resolve, 50));
                setTimeout(function () {
                    SetColor(number, padColorOrange);
                }, 100);
                setTimeout(function () {
                    SetColor(number, padColorGray);
                }, 150);

            }
        }
        ClearTable();
    } catch (error) {
        console.error("Error:", error);
    }
}

async function fetchData(input) {
    try {
        const response = await fetch(input);
        if (!response.ok) {
            throw new Error('Error on fetch data');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error on fetch data:', error);
        return [];
    }
}


async function LoadSamples() {
    let sampleValue = selectElement.value;

    ClearTable();

    if (sampleValue === 'no_selection') {
        return;
    }

    ShowOverlay();

    // we preload audio content, thus eliminating the delay in downloading when clicked

    const sampleData = await fetchData(sampleValue);
    const base64Results = await prepareSamples(sampleData);

    base64Results.forEach(({sample, urlData}) => {
        let targetCell = tdNodesMap.get(sample.id.toString());
        if (targetCell && urlData !== null) {
            targetCell.setAttribute('data-url', urlData);
            targetCell.setAttribute('data-action', 'play');
            targetCell.textContent = sample.id + ' ' + sample.name;
            if (sample.color) {
                let padColor = findKeyByValue(sample.color, colorMap);
                SetColor(sample.id, padColor);
            } else {
                SetColor(sample.id, padColorOrange);
            }
        }
    });
    // fake await for testing
    // await new Promise(resolve => setTimeout(resolve, 5000));
    HideOverlay();
}

async function prepareSamples(samples) {
    const base64Promises = samples.map(async (sample) => {
        try {
            // detect mime type
            let mimeType = 'audio/ogg';
            const fileExtension = sample.url.split('.').pop().toLowerCase();
            switch (fileExtension) {
                case 'wav':
                    mimeType = 'audio/wav';
                    break;
                case 'mp3':
                    mimeType = 'audio/mpeg';
                    break;
            }
            let urlData = sample.url;

            if (preloadSamplesToggle.checked) {
                const response = await fetch(sample.url);
                if (!response.ok) {
                    throw new Error('Error on fetch data');
                }
                const arrayBuffer = await response.arrayBuffer();
                let base64Data = arrayBufferToBase64(arrayBuffer);
                urlData = `data:${mimeType};base64,${base64Data}`;
            }
            return {sample, urlData: urlData};
        } catch (error) {
            console.error('Error on fetch data:', error);
            return {sample, urlData: null};
        }
    });

    return await Promise.all(base64Promises);
}

function arrayBufferToBase64(buffer, url) {
    let binary = '';
    const bytes = [].slice.call(new Uint8Array(buffer));
    bytes.forEach((b) => binary += String.fromCharCode(b));
    return window.btoa(binary);
}
