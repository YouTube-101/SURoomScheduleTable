let data = {};
let events = [];
let language = "en";
let nowts = 0;
let beta = false;
let mode = "GENERAL";
async function getFile() {
    switch (window.location.search) {
        case "?mode=GENERAL": mode = "GENERAL"; break;
        case "?mode=EXAM": mode = "EXAM"; break;
        case "?mode=FREE": mode = "FREE"; break;
        default: mode = "GENERAL"; break;
    }
    if (mode == "EXAM") {
        document.getElementById("header").style.backgroundColor = "red";
        document.getElementById("maindiv").children[0].style.backgroundColor = "#950000";
    }
    else if (mode == "FREE") {
        document.getElementById("header").style.backgroundColor = "green";
        document.getElementById("maindiv").children[0].style.backgroundColor = "#059500";
    }
    else {
        document.getElementById("maindiv").children[0].style.backgroundColor = "#002095";
    }
    language = "tr";
    ToggleLanguage();
    if (!beta) {
        ts = await fetch("https://ytube101.com/roomschedulets");
        ts = parseInt(await ts.text());
        if (nowts == ts) return;
        for (let i = 1; i < document.getElementById("maindiv").children.length; i++) {
            document.getElementById("maindiv").children[i].remove();
        }
        nowts = ts;
    }
    let data = await fetch(beta ? "/schedule.json" : "https://ytube101.com/roomscheduledata.json");
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
    if (mode == "FREE") {
        const currentTS = new Date().getTime() / 60000;
        for (let i = 0; i < data.length; i++) {
            let prevTS = currentTS;
            if (!data[i].events.length) {
                let obj = {
                    time: prevTS,
                    length: currentTS + 172800,
                    code: "N/A",
                    type: "FREE",
                    text: "No Scheduled Events for 120 days",
                    owner: [data[i].room.name + " (" + data[i].room.capacity + ")"],
                    location: [data[i].room.building + " " + data[i].room.code],
                };
                if ((data[i].room.name.includes("Lab") && data[i].room.building != "SL") || data[i].room.name.includes("Studio")) obj.owner[0] += " 🔒";
                events.push(obj);
            }
            else {
                prevTS = 0;
                data[i].events.sort((a, b) => (a.time + a.length) - (b.time + b.length));
                for (let j = 0; j < data[i].events.length; j++) {
                    data[i].events[j].lastEnd = prevTS;
                    prevTS = data[i].events[j].time + data[i].events[j].length;
                }
                for (let j = 0; j < data[i].events.length; j++) {
                    let obj = {
                        time: data[i].events[j].lastEnd,
                        length: data[i].events[j].time - data[i].events[j].lastEnd,
                        code: data[i].events[j].code,
                        type: data[i].events[j].brief.type,
                        text: data[i].events[j].brief.text,
                        owner: [data[i].room.name + " (" + data[i].room.capacity + ")"],
                        location: [data[i].room.building + " " + data[i].room.code],
                    }
                    if ((data[i].room.name.includes("Lab") && data[i].room.building != "SL") || data[i].room.name.includes("Studio")) obj.owner[0] += " 🔒";
                    if (obj.length >= 30) events.push(obj);
                }
                if (prevTS < currentTS + 172800) {
                    let obj = {
                        time: prevTS,
                        length: (currentTS + 172800) - prevTS,
                        code: "N/A",
                        type: "FREE",
                        text: "No more Scheduled Events for " + Math.ceil(((currentTS + 172800) - prevTS) / 1440) + " days",
                        owner: [data[i].room.name + " (" + data[i].room.capacity + ")"],
                        location: [data[i].room.building + " " + data[i].room.code],
                    };
                    if ((data[i].room.name.includes("Lab") && data[i].room.building != "SL") || data[i].room.name.includes("Studio")) obj.owner[0] += " 🔒";
                    if (obj.length >= 30) events.push(obj);
                }
            }
        }
    }
    else {
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
                    obj.owner.filter(o => {
                        return String(o) != "undefined";
                    });
                    if (obj.owner.length == 0) obj.owner = [""];
                    if ((mode == "EXAM" && obj.type == "EXAM") || mode != "EXAM") events.push(obj);
                }
            }
        }
        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                if ((events[i].text == events[j].text) && (events[i].time == events[j].time) && (events[i].length == events[j].length) && (events[i].code == events[j].code)) {
                    events[i].location.push(events[j].location[0]);
                    events[j].type = "DUPE";
                    events.splice(j, 1);
                    j--;
                }
            }
        }
    }
    let query = {}
    window.location.search.substring(1).split("&").map(k => { return k.split("=") }).forEach(idx => { query[idx[0]] = idx[1]; });
    console.log(query);
    if (mode == "FREE") {
        events.sort((a, b) => (a.time) - (b.time));
        events.sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return a.length - b.length;
        });
    }
    else events.sort((a, b) => (a.time + a.length) - (b.time + b.length));
    let scroll = 0;
    events.forEach((event, index) => {
        if (query.event && query.event == event.code && scroll == 0) {
            if (window.innerWidth <= 800) scroll = 310.8 * (index - 1);
            else scroll = 70.8 * (index - 1);
            if (index - 1 > 500) max += 1
            if (index - 1 > 1000) max += 1
            if (index - 1 > 1500) max += 1
            if (index - 1 > 2000) max += 1
            if (index - 1 > 3000) max += 1
            if (index - 1 > 4000) max += 1
            if (index - 1 > 5000) max += 1
            if (index - 1 > 6000) max += 1
            if (index - 1 > 7000) max += 1
            if (index - 1 > 8000) max += 1
            if (index - 1 > 9000) max += 1
            if (index - 1 > 10000) max += 1
            if (index - 1 > 11000) max += 1
            if (index - 1 > 12000) max += 1
        }
        InsertRow(event.time, event.length, event.code, event.type, event.text, event.owner[0], event.location, index);
    });
    await UpdateRemarks();
    scrollTo(0, scroll);
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
    if (mode == "FREE") {
        if (endTS <= currentTS) {
            text = (language == "en") ? "Event has started" : "Etkinlik başladı";
            color = "rgba(255, 54, 88, 1)";
        }
        else if (endTS - currentTS < 600000) {
            const remaining = endTS - currentTS;
            const minutes = Math.floor((remaining % 3600000) / 60000);
            text = (language == "en") ? "Event starts in " + minutes + "m" : minutes + "dk'ya dolacak";
            blinking = true;
        }
        else if (endTS - currentTS < 3600000) {
            const remaining = endTS - currentTS;
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            text = "Event starts in " + ((hours > 0) ? (hours + "h ") : "") + minutes + "m";
            if (language == "tr") text = ((hours > 0) ? (hours + "sa ") : "") + minutes + "dk'ya dolacak";
            color = "rgb(255, 89, 118)";
        }
        else if (startTS <= currentTS) {
            text = (language == "en") ? "Available now" : "Şu anda müsait";
        }
        else if (startTS - currentTS < 600000) {
            const remaining = startTS - currentTS;
            const minutes = Math.floor((remaining % 3600000) / 60000);
            text = (language == "en") ? "Available in " + minutes + "m" : minutes + "dk'ya müsait";
            blinking = true;
        }
        else if (startTS - currentTS < 3600000) {
            const remaining = startTS - currentTS;
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            text = "Available in " + ((hours > 0) ? (hours + "h ") : "") + minutes + "m";
            if (language == "tr") text = ((hours > 0) ? (hours + "sa ") : "") + minutes + "dk'ya müsait";
            color = "rgb(240, 255, 89)";
        }
        else {
            text = "";
            color = "";
        }
    }
    else {
        if (endTS <= currentTS) {
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
    }
    if (del) {
        document.getElementById("maindiv").children[index].remove();
        events.splice(index - 1, 1);
        return true;
    }
    else {
        document.getElementById("maindiv").children[index].children[5].children[0].innerText = text;
        document.getElementById("maindiv").children[index].children[5].children[0].style.color = color;
        document.getElementById("maindiv").children[index].children[5].classList.toggle("blink", blinking);
        document.getElementById("maindiv").children[index].classList.remove("above500");
        document.getElementById("maindiv").children[index].classList.remove("above1000");
        document.getElementById("maindiv").children[index].classList.remove("above1500");
        document.getElementById("maindiv").children[index].classList.remove("above2000");
        document.getElementById("maindiv").children[index].classList.remove("above3000");
        document.getElementById("maindiv").children[index].classList.remove("above4000");
        document.getElementById("maindiv").children[index].classList.remove("above5000");
        document.getElementById("maindiv").children[index].classList.remove("above6000");
        document.getElementById("maindiv").children[index].classList.remove("above7000");
        document.getElementById("maindiv").children[index].classList.remove("above8000");
        document.getElementById("maindiv").children[index].classList.remove("above9000");
        document.getElementById("maindiv").children[index].classList.remove("above10000");
        document.getElementById("maindiv").children[index].classList.remove("above11000");
        document.getElementById("maindiv").children[index].classList.remove("above12000");
        if (index > 500 && max < 1) document.getElementById("maindiv").children[index].classList.add("above500");
        if (index > 1000 && max < 2) document.getElementById("maindiv").children[index].classList.add("above1000");
        if (index > 1500 && max < 3) document.getElementById("maindiv").children[index].classList.add("above1500");
        if (index > 2000 && max < 4) document.getElementById("maindiv").children[index].classList.add("above2000");
        if (index > 3000 && max < 5) document.getElementById("maindiv").children[index].classList.add("above3000");
        if (index > 4000 && max < 6) document.getElementById("maindiv").children[index].classList.add("above4000");
        if (index > 5000 && max < 7) document.getElementById("maindiv").children[index].classList.add("above5000");
        if (index > 6000 && max < 8) document.getElementById("maindiv").children[index].classList.add("above6000");
        if (index > 7000 && max < 9) document.getElementById("maindiv").children[index].classList.add("above7000");
        if (index > 8000 && max < 10) document.getElementById("maindiv").children[index].classList.add("above8000");
        if (index > 9000 && max < 11) document.getElementById("maindiv").children[index].classList.add("above9000");
        if (index > 10000 && max < 12) document.getElementById("maindiv").children[index].classList.add("above10000");
        if (index > 11000 && max < 13) document.getElementById("maindiv").children[index].classList.add("above11000");
        if (index > 12000 && max < 14) document.getElementById("maindiv").children[index].classList.add("above12000");
    }
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
const debugdate = true;
function UpdateLocation(index, justlang = false, showingdate = false) {
    const rightnow = new Date();
    const eventtime = new Date((events[index - 1].time + (mode=="FREE"?events[index-1].length:0)) * 60000);
    const time = eventtime.getHours().toString().padStart(2, '0') + ":" + eventtime.getMinutes().toString().padStart(2, '0');
    const starttime = new Date((events[index - 1].time) * 60000);
    const start = starttime.getHours().toString().padStart(2, '0') + ":" + starttime.getMinutes().toString().padStart(2, '0');
    rightnow.setHours(0, 0, 0, 0);
    eventtime.setHours(0, 0, 0, 0);
    starttime.setHours(0, 0, 0, 0);
    const diff = (eventtime.getTime() - rightnow.getTime()) / (1000 * 60 * 60 * 24);
    const showday = (diff < 6 && diff != 0);
    const eventday = (language == "tr") ? (["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"][eventtime.getDay()]) : (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][eventtime.getDay()]);
    if (!showingdate && !debugdate) {
        if (mode != "FREE") document.getElementById("maindiv").children[index].children[0].children[0].innerText = time;
        else document.getElementById("maindiv").children[index].children[0].children[0].innerText = start;
        document.getElementById("maindiv").children[index].children[0].classList.remove("showdate");
    }
    else if (diff != 0 || debugdate) {
        if (diff == 1 && !debugdate) document.getElementById("maindiv").children[index].children[0].children[0].innerText = (language == "tr") ? "Yarın" : "Tomorrow";
        else if (showday && !debugdate) document.getElementById("maindiv").children[index].children[0].children[0].innerText = eventday;
        else document.getElementById("maindiv").children[index].children[0].children[0].innerText = (language == "tr") ? (eventtime.getDate().toString() + " " + ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"][eventtime.getMonth()]) : (["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][eventtime.getMonth()] + " " + eventtime.getDate().toString() + getOrdinal(parseInt(eventtime.getDate())));
        document.getElementById("maindiv").children[index].children[0].classList.add("showdate");
    }
    if (!justlang) {
        if (!events[index - 1].locationindex) {
            if (events[index - 1].location.length != 1) events[index - 1].locationindex = 1;
        }
        else if (events[index - 1].locationindex >= (events[index - 1].location.length) - 1) events[index - 1].locationindex = 0;
        else events[index - 1].locationindex++;
        if (!events[index - 1].ownerindex) {
            if (events[index - 1].owner.length != 1) events[index - 1].ownerindex = 1;
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
    if (String(events[index - 1].owner[events[index - 1].ownerindex]) != "undefined") document.getElementById("maindiv").children[index].children[3].innerText = events[index - 1].owner[events[index - 1].ownerindex];
    if (String(events[index - 1].location[events[index - 1].locationindex]) != "undefined") document.getElementById("maindiv").children[index].children[4].innerText = events[index - 1].location[events[index - 1].locationindex];
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
    document.getElementById("maindiv").children[0].children[0].children[0].innerText = (mode == "FREE") ? ((language == "en") ? "Aval. At" : "Uyg. St.") : ((language == "en") ? "Time" : "Zaman");
    document.getElementById("maindiv").children[0].children[0].children[1].innerText = (mode == "FREE") ? ((language == "en") ? "Nxt. Ev." : "Gel. Et.") : ((language == "en") ? "End" : "Bitiş");
    document.getElementById("maindiv").children[0].children[1].innerText = (language == "en") ? "Code" : "Kod";
    document.getElementById("maindiv").children[0].children[2].innerText = (mode == "FREE") ? ((language == "en") ? "Next Event Name" : "Gelecek Etkinlik Adı") : ((language == "en") ? "Event Name" : "Etkinlik Adı");
    document.getElementById("maindiv").children[0].children[3].innerText = (mode == "FREE") ? ((language == "en") ? "Room Name & Capacity" : "Oda Adı & Kapasite") : ((language == "en") ? "Event Owner" : "Etkinlik Sahibi");
    document.getElementById("maindiv").children[0].children[4].innerText = (language == "en") ? "Location" : "Konum";
    document.getElementById("maindiv").children[0].children[5].innerText = (language == "en") ? "Remarks" : "Açıklamalar";
    document.getElementById("header").children[0].innerText = (mode == "EXAM") ? ((language == "en") ? "EXAMS LIST" : "SINAV LİSTESİ") : (mode == "FREE" ? ((language == "en") ? "UNSCHEDULED ROOMS" : "REZERVASYONSUZ ODALAR") : ((language == "en") ? "CAMPUS EVENTS" : "KAMPÜS ETKİNLİKLERİ"));
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
let max = 0;
let overloading = false;
window.addEventListener("scroll", (e) => {
    if (window.scrollY > document.body.scrollHeight - 900) {
        if (overloading == false) {
            overloading = true;
            max++;
            console.log("INCREASING MAX TO " + max);
            for (let index = 0; index < document.getElementById("maindiv").children.length; index++) {
                document.getElementById("maindiv").children[index].classList.remove("above500");
                document.getElementById("maindiv").children[index].classList.remove("above1000");
                document.getElementById("maindiv").children[index].classList.remove("above1500");
                document.getElementById("maindiv").children[index].classList.remove("above2000");
                document.getElementById("maindiv").children[index].classList.remove("above3000");
                document.getElementById("maindiv").children[index].classList.remove("above4000");
                document.getElementById("maindiv").children[index].classList.remove("above5000");
                document.getElementById("maindiv").children[index].classList.remove("above6000");
                document.getElementById("maindiv").children[index].classList.remove("above7000");
                document.getElementById("maindiv").children[index].classList.remove("above8000");
                document.getElementById("maindiv").children[index].classList.remove("above9000");
                document.getElementById("maindiv").children[index].classList.remove("above10000");
                document.getElementById("maindiv").children[index].classList.remove("above11000");
                document.getElementById("maindiv").children[index].classList.remove("above12000");
                if (index > 500 && max < 1) document.getElementById("maindiv").children[index].classList.add("above500");
                if (index > 1000 && max < 2) document.getElementById("maindiv").children[index].classList.add("above1000");
                if (index > 1500 && max < 3) document.getElementById("maindiv").children[index].classList.add("above1500");
                if (index > 2000 && max < 4) document.getElementById("maindiv").children[index].classList.add("above2000");
                if (index > 3000 && max < 5) document.getElementById("maindiv").children[index].classList.add("above3000");
                if (index > 4000 && max < 6) document.getElementById("maindiv").children[index].classList.add("above4000");
                if (index > 5000 && max < 7) document.getElementById("maindiv").children[index].classList.add("above5000");
                if (index > 6000 && max < 8) document.getElementById("maindiv").children[index].classList.add("above6000");
                if (index > 7000 && max < 9) document.getElementById("maindiv").children[index].classList.add("above7000");
                if (index > 8000 && max < 10) document.getElementById("maindiv").children[index].classList.add("above8000");
                if (index > 9000 && max < 11) document.getElementById("maindiv").children[index].classList.add("above9000");
                if (index > 10000 && max < 12) document.getElementById("maindiv").children[index].classList.add("above10000");
                if (index > 11000 && max < 13) document.getElementById("maindiv").children[index].classList.add("above11000");
                if (index > 12000 && max < 14) document.getElementById("maindiv").children[index].classList.add("above12000");
            };
        }
    }
    else if (overloading == true) {
        overloading = false;
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key.toUpperCase() == "G" && mode != "GENERAL") window.location.href = "/";
    else if (e.key.toUpperCase() == "E" && mode != "EXAM") window.location.href = "/?mode=EXAM";
});

getFile();
loop();
