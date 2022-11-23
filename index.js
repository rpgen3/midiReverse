(async () => {
    const {importAll, getScript} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await Promise.all([
        'https://code.jquery.com/jquery-3.3.1.min.js',
        'https://colxi.info/midi-parser-js/src/main.js'
    ].map(getScript));
    const {$, MidiParser} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('MIDI反転');
    $('<h2>').appendTo(head).text('MIDIファイルを音階で反転する');
    const rpgen3 = await importAll([
        'input',
        'css',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    const rpgen4 = await importAll([
        [
            'MidiNote',
            'MidiNoteMessage',
            'MidiTempoMessage',
            'toMIDI'
        ].map(v => `https://rpgen3.github.io/piano/mjs/midi/${v}.mjs`)
    ].flat());
    Promise.all([
        'container',
        'tab',
        'btn'
    ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`).map(rpgen3.addCSS));
    const hideTime = 500;
    const addHideArea = (label, parentNode = main) => {
        const html = $('<div>').addClass('container').appendTo(parentNode);
        const input = rpgen3.addInputBool(html, {
            label,
            save: true,
            value: true
        });
        const area = $('<dl>').appendTo(html);
        input.elm.on('change', () => input() ? area.show(hideTime) : area.hide(hideTime)).trigger('change');
        return Object.assign(input, {
            get html(){
                return area;
            }
        });
    };
    let g_midi = null;
    {
        const {html} = addHideArea('input MIDI file');
        $('<dt>').appendTo(html).text('MIDIファイル');
        const inputFile = $('<input>').appendTo($('<dd>').appendTo(html)).prop({
            type: 'file',
            accept: '.mid'
        });
        MidiParser.parse(inputFile.get(0), v => {
            g_midi = v;
        });
    }
    let inputInvertAxis = null;
    let isIgnoredDram = null;
    {
        const {html} = addHideArea('settings');
        inputInvertAxis = rpgen3.addInputStr(html, {
            label: '反転軸（0～127）',
            save: true,
            value: 63.5
        });
        isIgnoredDram = rpgen3.addInputBool(html, {
            label: 'ドラムは無視する',
            save: true,
            value: true
        });
    }
    {
        const {html} = addHideArea('execute');
        $('<dd>').appendTo(html);
        rpgen3.addBtn(html, 'MIDIの反転', () => {
            try {
                reverseMidi();
            } catch (err) {
                console.error(err);
                alert(err);
            }
        }).addClass('btn');
    }
    const dramChannel = 0x9;
    const reverseMidi = () => {
        if(!g_midi) {
            throw 'Error: Must input MIDI file.';
        }
        const invertAxis = Number(inputInvertAxis());
        if(Number.isNaN(invertAxis)) {
            throw 'Error: Invalid value encountered in invert axis.';
        }
        const _isIgnoredDram = isIgnoredDram();
        const midiNoteArray = rpgen4.MidiNote.makeArray(g_midi);
        for (const midiNote of midiNoteArray) {
            if (!_isIgnoredDram || midiNote.channel !== dramChannel) {
                midiNote.pitch = 2 * invertAxis - midiNote.pitch;
            }
        }
        const midiNoteMessageArray = rpgen4.MidiNoteMessage.makeArray(midiNoteArray);
        const {bpm} = rpgen4.MidiTempoMessage.makeArray(g_midi)[0];
        const {timeDivision} = g_midi;
        const midiFile = rpgen4.toMIDI({
            tracks: midiNoteMessageArray2tracks(midiNoteMessageArray),
            bpm,
            div: timeDivision
        });
        rpgen3.download(
            midiFile,
            `midiReverse.mid`
        );
    };
    const midiNoteMessageArray2tracks = midiNoteMessageArray => {
        const m = new Map;
        for (const midiNoteMessage of midiNoteMessageArray) {
            if (!m.has(midiNoteMessage.channel)) {
                m.set(midiNoteMessage.channel, []);
            }
            m.get(midiNoteMessage.channel).push(midiNoteMessage);
        }
        return [...m].sort((a, b) => a[0] - b[0]);
    };
})();
