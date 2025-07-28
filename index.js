let data = {};
let events = [];
let language = "en";
let nowts = 0;
let beta = false;
async function getFile() {
    if (!beta) {
        ts = await fetch("https://ytube101.com/roomschedulets");
        ts = parseInt(await ts.text());
        if (nowts == ts) return;
        for (let i = 1; i < document.getElementById("maindiv").children.length; i++) {
            document.getElementById("maindiv").children[i].remove();
        }
        nowts = ts;
    }
    let data = await fetch(beta?"/schedule.json":"https://ytube101.com/roomscheduledata.json");
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
                    owner: [data[i].events[j].brief.owner],
                    location: [data[i].room.building + " " + data[i].room.code],
                }
                if (obj.type == "COURSE") {
                    obj.owner = data[i].events[j].details.course.instructors;
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
    let query = {}
    window.location.search.substring(1).split("&").map(k => {return k.split("=")}).forEach(idx => {query[idx[0]] = idx[1];});
    console.log(query);
    events.sort((a, b) => (a.time + a.length) - (b.time + b.length));
    let scroll = 0;
    events.forEach((event,index) => {
        if (query.event && query.event == event.code && scroll == 0) {
            if (window.innerWidth <= 800) scroll = 310.8*(index-1);
            else scroll = 70.8*(index-1);
        }
        InsertRow(event.time, event.length, event.code, event.type, event.text, event.owner[0], event.location);
    });
    UpdateRemarks();
    scrollTo(0,scroll);
    console.log(data);
    console.log(events);
}
function InsertRow(start, length, code, type, text, owner, location) {
    const row = document.createElement("div");
    const dtime = document.createElement("div");
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
    if (stime.innerText.substring(0, 2) == "24") stime.innerText = "00" + stime.innerText.substring(2);
    end = new Date((start + length) * 60000);
    etime.innerText = (end.getUTCHours() + 3).toString().padStart(2, '0') + ":" + end.getUTCMinutes().toString().padStart(2, '0');
    if (etime.innerText.substring(0, 2) == "24") etime.innerText = "00" + etime.innerText.substring(2);
    codetext.innerText = code;
    textfield.innerText = text;
    ownertext.innerText = owner;
    roomcode.innerText = location[0];
    remarks.appendChild(remarkstext);
    remarks.appendChild(remarkstext);
    dtime.appendChild(stime);
    dtime.appendChild(etime);
    row.appendChild(dtime);
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
    document.getElementById("maindiv").children[index].children[5].children[0].innerText = text;
    document.getElementById("maindiv").children[index].children[5].children[0].style.color = color;
    document.getElementById("maindiv").children[index].children[5].classList.toggle("blink", blinking);
    return false;
}
function getOrdinal(n) {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
    }
}
function UpdateLocation(index, justlang = false, showingdate = false) {
    const rightnow = new Date();
    const eventtime = new Date(events[index - 1].time * 60000);
    const time = eventtime.getHours().toString().padStart(2, '0') + ":" + eventtime.getMinutes().toString().padStart(2, '0');
    rightnow.setHours(0, 0, 0, 0);
    eventtime.setHours(0, 0, 0, 0);
    const diff = (eventtime.getTime() - rightnow.getTime()) / (1000 * 60 * 60 * 24);
    const showday = (diff < 6 && diff != 0);
    const eventday = (language == "tr")?(["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"][eventtime.getDay()]):(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][eventtime.getDay()]);
    if (!showingdate) {
        document.getElementById("maindiv").children[index].children[0].children[0].innerText = time;
        document.getElementById("maindiv").children[index].children[0].classList.remove("showdate");
    }
    else if (diff != 0) {
        if (diff == 1) document.getElementById("maindiv").children[index].children[0].children[0].innerText = (language == "tr")?"Yarın": "Tomorrow";
        else if (showday) document.getElementById("maindiv").children[index].children[0].children[0].innerText = eventday;
        else document.getElementById("maindiv").children[index].children[0].children[0].innerText = (language == "tr")?(eventtime.getDate().toString() + " " + ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][eventtime.getMonth()]):(["January","February","March","April","May","June","July","August","September","October","November","December"][eventtime.getMonth()] + " " + eventtime.getDate().toString() + getOrdinal(parseInt(eventtime.getDate())));
        document.getElementById("maindiv").children[index].children[0].classList.add("showdate");
    }
    if (!justlang) {
        if (!events[index - 1].locationindex) {
            if (events[index - 1].location.length == 1) return;
            else events[index - 1].locationindex = 1;
        }
        else if (events[index - 1].locationindex >= (events[index - 1].location.length) - 1) events[index - 1].locationindex = 0;
        else events[index - 1].locationindex++;
        if (!events[index - 1].ownerindex) {
            if (events[index - 1].owner.length == 1) return;
            else events[index - 1].ownerindex = 1;
        }
        else if (events[index - 1].ownerindex >= (events[index - 1].owner.length) - 1) events[index - 1].ownerindex = 0;
        else events[index - 1].ownerindex++;
    }
    else {
        if (events[index - 1].locationindex == undefined) {
            events[index - 1].locationindex = 0;
        }
        if (events[index - 1].ownerindex == undefined) {
            events[index - 1].ownerindex = 0;
        }
    }
    let text = events[index - 1].location[events[index - 1].locationindex];
    document.getElementById("maindiv").children[index].children[3].innerText = events[index - 1].owner[events[index - 1].ownerindex];
    document.getElementById("maindiv").children[index].children[4].innerText = text;
}
function UpdateRemarks() {
    for (let i = 0; i < events.length; i++) {
        if (UpdateRemark(i + 1, events[i].time, events[i].length)) {
            i--;
        }
    }
}
let showingdate = false;
function UpdateLocations(justlang = false) {
    if (!justlang) showingdate = !showingdate;
    for (let i = 0; i < events.length; i++) {
        UpdateLocation(i + 1, justlang, showingdate);
    }
}
function ToggleLanguage() {
    language = (language == "en") ? "tr" : "en";
    document.getElementById("maindiv").children[0].children[0].children[0].innerText = (language == "en") ? "Time" : "Zaman";
    document.getElementById("maindiv").children[0].children[0].children[1].innerText = (language == "en") ? "End" : "Bitiş";
    document.getElementById("maindiv").children[0].children[1].innerText = (language == "en") ? "Code" : "Kod";
    document.getElementById("maindiv").children[0].children[2].innerText = (language == "en") ? "Event Name" : "Etkinlik Adı";
    document.getElementById("maindiv").children[0].children[3].innerText = (language == "en") ? "Event Owner" : "Etkinlik Sahibi";
    document.getElementById("maindiv").children[0].children[4].innerText = (language == "en") ? "Location" : "Konum";
    document.getElementById("maindiv").children[0].children[5].innerText = (language == "en") ? "Remarks" : "Açıklamalar";
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
        if (new Date().getTime() - lasttime > 3000) {
            lasttime = new Date().getTime();
            UpdateLocations();
        }
        if (new Date().getTime() - lastlangtime > 20000) {
            lastlangtime = new Date().getTime();
            ToggleLanguage();
        }
        if (new Date().getMinutes() == 0 && new Date().getMinutes() == 15 && !reloaded) {
            getFile();
            reloaded = true;
        }
        else if (new Date().getMinutes() == 0 && new Date().getMinutes() == 15) {
            reloaded = false;
        }
    }
}
getFile();
loop();
