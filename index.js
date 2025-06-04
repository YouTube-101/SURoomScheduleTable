let data = {};
let events = [];
let language = "en";
let nowts = 0;
async function getFile() {
    ts = await fetch("https://ytube101.com/roomschedulets");
    ts = parseInt(await ts.text());
    if (nowts == ts) return;
    for (let i = 1; i < document.getElementById("maindiv").children.length; i++) {
        document.getElementById("maindiv").children[i].remove();
    }
    nowts = ts;
    data = await fetch("https://ytube101.com/roomscheduledata.json");
    data = await data.json();
    let rooms = [];
    for (let b = 0; b < Object.keys(data).length; b++) {
        const building = Object.keys(data)[b];
        for (let i = 0; i < Object.keys(data[building]).length; i++) {
            data[building][Object.keys(data[building])[i]].room.building = building;
            rooms.push(data[building][Object.keys(data[building])[i]]);
        }
    }
    data = rooms;
    events = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i].events.length) {
            for (let j = 0; j < data[i].events.length; j++) {
                let obj = {
                    time: data[i].events[j].time,
                    length: data[i].events[j].length,
                    code: data[i].events[j].code,
                    type: data[i].events[j].brief.type,
                    text: data[i].events[j].brief.text,
                    owner: data[i].events[j].brief.owner,
                    location: [data[i].room.building + " " + data[i].room.code],
                }
                events.push(obj);
            }
        }
    }
    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            if ((events[i].text == events[j].text) && (events[i].time == events[j].time) && (events[i].length == events[j].length)) {
                events[i].location.push(events[j].location[0]);
                events[j].type = "DUPE";
                events.splice(j, 1);
                j--;
            }
        }
    }
    events.sort((a, b) => (a.time + a.length) - (b.time + b.length));
    events.forEach(event => {
        InsertRow(event.time, event.length, event.code, event.type, event.text, event.owner, event.location);
    });
    UpdateRemarks();
    console.log(data);
    console.log(events);
}
function InsertRow(start, length, code, type, text, owner, location) {
    const row = document.createElement("div");
    const stime = document.createElement("h3");
    const etime = document.createElement("h3");
    const codetext = document.createElement("h3");
    const textfield = document.createElement("h3");
    const ownertext = document.createElement("h3");
    const roomcode = document.createElement("h3");
    const remarks = document.createElement("div");
    const remarkstext = document.createElement("h3");
    time = new Date(start * 60000);
    stime.innerText = (time.getUTCHours() + 3).toString().padStart(2, '0') + ":" + time.getUTCMinutes().toString().padStart(2, '0');
    end = new Date((start + length) * 60000);
    etime.innerText = (end.getUTCHours() + 3).toString().padStart(2, '0') + ":" + end.getUTCMinutes().toString().padStart(2, '0');
    codetext.innerText = code;
    textfield.innerText = text;
    ownertext.innerText = owner;
    roomcode.innerText = location[0];
    remarks.appendChild(remarkstext);
    remarks.appendChild(remarkstext);
    row.appendChild(stime);
    row.appendChild(etime);
    row.appendChild(codetext);
    textfield.style.color = { "COURSE": "rgb(255, 247, 89)", "EXAM": "rgb(255, 89, 89)", "ASP": "rgb(89, 89, 255)", "EVENT": "white", "DUPE": "purple" }[type];
    row.appendChild(textfield);
    row.appendChild(ownertext);
    row.appendChild(roomcode);
    row.appendChild(remarks);
    document.getElementById("maindiv").appendChild(row);
}
function UpdateRemark(index, start, length) {
    time = new Date(start * 60000);
    end = new Date((start + length) * 60000);
    const currentTS = new Date().getTime();
    const startTS = time.getTime();
    const endTS = end.getTime();
    let text = "";
    let color = "white";
    let blinking = false;
    let del = false;
    if (currentTS - endTS > 600000) {
        del = true;
    }
    else if (endTS <= currentTS) {
        text = "Event Ended";
        if (language == "tr") text = "Etkinlik Bitti";
    }
    else if (startTS <= currentTS && currentTS - startTS < 1200000) {
        const remaining = currentTS - startTS;
        const minutes = Math.floor((remaining % 3600000) / 60000);
        text = "Started " + minutes + "m ago";
        if (language == "tr") text = minutes + "dk önce başladı";
        if (minutes == 0) {
            text = "Started Now";
            if (language == "tr") text = "Şimdi Başladı";
        }
        blinking = true;
    }
    else if (startTS <= currentTS) {
        const remaining = endTS - currentTS;
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        text = "Ends in " + ((hours > 0) ? (hours + "h ") : "") + minutes + "m";
        if (language == "tr") text = ((hours > 0) ? (hours + "sa ") : "") + minutes + "dk'ya bitecek";
        color = "rgb(255, 89, 118)";
    }
    else if (startTS - currentTS < 600000) {
        const remaining = startTS - currentTS;
        const minutes = Math.floor((remaining % 3600000) / 60000);
        text = "Starting in " + minutes + "m";
        if (language == "tr") text = minutes + "dk'ya Başlayacak";
        if (minutes == 0) {
            text = "Starting Soon";
            if (language == "tr") text = "Az Sonra Başlayacak";
        }
        blinking = true;
    }
    else if (startTS - currentTS < 3600000) {
        const remaining = startTS - currentTS;
        const minutes = Math.floor((remaining % 3600000) / 60000);
        text = "Starts in " + minutes + "m";
        if (language == "tr") text = minutes + "dk'ya başlayacak";
        color = "rgb(240, 255, 89)";
    }
    if (del) {
        document.getElementById("maindiv").children[index].remove();
        events.splice(index - 1, 1);
        return true;
    }
    document.getElementById("maindiv").children[index].children[6].children[0].innerText = text;
    document.getElementById("maindiv").children[index].children[6].children[0].style.color = color;
    document.getElementById("maindiv").children[index].children[6].classList.toggle("blink", blinking);
    return false;
}
function UpdateLocation(index, justlang = false) {
    if (!justlang) {
        if (!events[index - 1].locationindex) {
            if (events[index - 1].location.length == 1) return;
            else events[index - 1].locationindex = 1;
        }
        else if (events[index - 1].locationindex >= (events[index - 1].location.length) - 1) events[index - 1].locationindex = 0;
        else events[index - 1].locationindex++;
    }
    else if (events[index - 1].locationindex == undefined) {
        events[index - 1].locationindex = 0;
    }
    let text = events[index - 1].location[events[index - 1].locationindex];
    if (language == "tr") text = text.replaceAll("FENS", "MDBF").replaceAll("FASS", "SSBF").replaceAll("FMAN", "YBF").replaceAll("KCC", "KİM").replaceAll("SL", "DO").replaceAll("UC", "ÜM");
    document.getElementById("maindiv").children[index].children[5].innerText = text;
}
function UpdateRemarks() {
    for (let i = 0; i < events.length; i++) {
        if (UpdateRemark(i + 1, events[i].time, events[i].length)) {
            i--;
        }
    }
}
function UpdateLocations(justlang = false) {
    for (let i = 0; i < events.length; i++) {
        UpdateLocation(i + 1, justlang);
    }
}
function ToggleLanguage() {
    language = (language == "en") ? "tr" : "en";
    document.getElementById("maindiv").children[0].children[0].innerText = (language == "en") ? "Time" : "Zaman";
    document.getElementById("maindiv").children[0].children[1].innerText = (language == "en") ? "End" : "Bitiş";
    document.getElementById("maindiv").children[0].children[2].innerText = (language == "en") ? "Code" : "Kod";
    document.getElementById("maindiv").children[0].children[3].innerText = (language == "en") ? "Event Name" : "Etkinlik Adı";
    document.getElementById("maindiv").children[0].children[4].innerText = (language == "en") ? "Event Owner" : "Etkinlik Sahibi";
    document.getElementById("maindiv").children[0].children[5].innerText = (language == "en") ? "Location" : "Konum";
    document.getElementById("maindiv").children[0].children[6].innerText = (language == "en") ? "Remarks" : "Açıklamalar";
    document.getElementById("header").children[0].innerText = (language == "en") ? "CAMPUS EVENTS" : "KAMPÜS ETKİNLİKLERİ";
    UpdateLocations(true);
    UpdateRemarks();
}
let lasttime = new Date().getTime();
let lastlangtime = new Date().getTime();
async function loop() {
    let done = false;
    let reloaded = false;
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (new Date().getSeconds() == 0 && !done) {
            UpdateRemarks();
            done = true;
        }
        else if (new Date().getSeconds() != 0) {
            done = false;
        }
        if (new Date().getTime() - lasttime > 2000) {
            lasttime = new Date().getTime();
            UpdateLocations();
        }
        if (new Date().getTime() - lastlangtime > 20000) {
            lastlangtime = new Date().getTime();
            ToggleLanguage();
        }
        if (new Date().getMinutes() % 5 == 0 && !reloaded) {
            getFile();
            reloaded = true;
        }
        else if (new Date().getMinutes() % 5 != 0) {
            reloaded = false;
        }
    }
}
getFile();
loop();