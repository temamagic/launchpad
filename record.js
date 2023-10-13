const newTrackBtn = document.getElementById('new-track');
const trackList = document.getElementById('track-list');

newTrackBtn.addEventListener("click", function () {
    const randomHash = Math.random().toString(36).substring(7);
    const panelDiv = document.createElement('div');
    panelDiv.className = 'panel panel-default';
    panelDiv.draggable = true;
    panelDiv.id = 'track-' + randomHash;
    const panelHeaderDiv = document.createElement('div');
    panelHeaderDiv.className = 'panel-heading';
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'btn-group pull-right';
    const minusButton = document.createElement('button');
    minusButton.type = 'button';
    minusButton.className = 'btn btn-danger';
    minusButton.innerHTML = '<span class="glyphicon glyphicon-minus" aria-hidden="true"></span>';
    const editPencilBtn = document.createElement('button');
    editPencilBtn.type = 'button';
    editPencilBtn.className = 'btn btn-warning';
    editPencilBtn.innerHTML = '<span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>';
    editPencilBtn.addEventListener('click', function () {
        const title = this.parentNode.parentNode.querySelector('.panel-title h4');
        const newTitle = prompt("Enter a new title", title.innerText);
        if (newTitle) {
            title.innerText = newTitle;
        }
    });
    buttonDiv.appendChild(editPencilBtn);
    buttonDiv.appendChild(minusButton);
    panelHeaderDiv.appendChild(buttonDiv);
    const panelTitleDiv = document.createElement('div');
    panelTitleDiv.className = 'panel-title';
    const titleH4 = document.createElement('h4');
    titleH4.innerText = 'Track ' + randomHash;

    panelTitleDiv.appendChild(titleH4);

    panelHeaderDiv.appendChild(buttonDiv);
    panelHeaderDiv.appendChild(panelTitleDiv);
    const panelBodyDiv = document.createElement('div');
    panelBodyDiv.className = 'panel-body';

    recordBtn = document.createElement('button');
    recordBtn.type = 'button';
    recordBtn.className = 'btn btn-primary record-btn';
    recordBtn.innerHTML = '<span class="glyphicon glyphicon-record" aria-hidden="true"></span>';
    recordBtn.addEventListener('click', RecordOrStop);

    minusButton.addEventListener('click', function () {
        panelDiv.remove();
    });

    panelBodyDiv.appendChild(recordBtn);

    panelDiv.appendChild(panelHeaderDiv);
    panelDiv.appendChild(panelBodyDiv);
    trackList.appendChild(panelDiv);
    return panelDiv;
});

let recording = false; // true if recording
let recordingID = null; // id of track being recorded
let mediaRecorder = null;
let startTime = 0;

function RecordOrStop() {
    if (recording === false) {
        recording = true;
        recordingID = this.parentNode.parentNode.id;
        startTime = new Date().getTime();
        this.innerHTML = '<span class="glyphicon glyphicon-stop" aria-hidden="true"></span>';
        this.className = 'btn btn-danger record-btn';
        mediaRecorder.start();
        console.log("recordingID", recordingID)
    } else {
        recording = false;
        this.innerHTML = '<span class="glyphicon glyphicon-record" aria-hidden="true"></span>';
        this.className = 'btn btn-primary record-btn';
        mediaRecorder.stop();
    }
}

if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({"audio": true}).then((stream) => {
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

            let trackDiv = document.getElementById(recordingID);
            let trackBody = trackDiv.querySelector('.panel-body');
            let seconds = Math.floor((new Date().getTime() - startTime) / 1000);


            trackBody.innerHTML = '<audio controls src="' + audioUrl + '"></audio>';

            let audio = trackBody.querySelector('audio');
            audio.currentTime = 0;
            audio.play();

            chunks = [];
            recordingID = null;
        };
    }).catch((err) => {
        console.log('The following getUserMedia error occured: ' + err);
    });
} else {
    alert('Your browser does not support the MediaDevices API');
}

new Sortable(trackList, {
    animation: 150,
    // ghostClass: 'blue-background-class'
    setData: function (dataTransfer, dragEl) {
        let body = dragEl.querySelector('.panel-body')
        let audio = body.querySelector('audio');
        let name = dragEl.querySelector('.panel-title h4').innerText;
        let url = audio ? audio.src : '';
        let data = {
            'id': dragEl.id,
            'text': name,
            'url': url
        }
        let dataString = JSON.stringify(data);
        dataTransfer.setData('text/plain', dataString);
    }
});
