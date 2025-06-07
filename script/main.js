const fs = require("fs");
const fetch = require("node-fetch");

async function ParseSchedule(schedule, start, finish, building) {
    schedule = schedule.substring(schedule.indexOf('<tr class="main-row">'));
    let rooms = schedule.split('<tr class="main-row">');
    rooms.shift();

    rooms = rooms.map(room => {
        room = room.substring(27);
        const roomcode = room.substring(0, room.indexOf("</h3>"));
        room = room.substring(roomcode.length + 8);
        const roomname = room.substring(0, room.indexOf("</p>"));
        room = room.substring(roomname.length + 19);
        const roomtype = room.substring(0, room.indexOf("</p>")).trim();
        room = room.substring(room.indexOf("<p>")+ 19);
        const capacity = parseInt(room.substring(0, room.indexOf("</i>")).trim());
        room = room.substring(room.indexOf("</p>")+ 68);
        room = room.substring(room.indexOf("</th>") + 10);
        room = room.substring(0, room.length - 18);
        let eventexists = false;
        while (room.includes("</td>")) {
            room = room.substring(room.indexOf(';">')+ 3);
            room = room.substring(room.indexOf('<div style="position:relative;">') + 33);
            if (room.startsWith("<a ")) {
                eventexists = true;
                room = room.substring(room.indexOf("<tr>"));
            }
            room = room.substring(4);
        }
        return {
            room: {
                code: roomcode.trim(),
                name: roomname.trim(),
                type: roomtype,
                capacity: capacity
            },
            eventexists: eventexists,
        }
    });
    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].eventexists) {
            console.log("Fetching events for " + rooms[i].room.code + "...");
            let html = await fetch("https://suis.sabanciuniv.edu/prod/sabanci_rooms.p_response_2_2_new?s_date="+start+"&e_date="+finish+"&b_code="+building+"&r_code="+rooms[i].room.code).then(async res => await res.text());
            html = html.substring(html.indexOf('<h4>Schedule Detail</h4>') + 26);
            html = html.substring(html.indexOf('<td><b>DETAIL</b></td>') + 30);
            html = html.substring(html.indexOf('</tr>') + 11);
            html = html.substring(0, html.lastIndexOf('</table>'));
            html = html.substring(0, html.lastIndexOf('</table>'));
            html = html.replaceAll("<td>","").replaceAll("</td>","").replaceAll("</tr>","");
            html = html.split("<tr>\n");
            html = html.map(event => {
                event = event.trim();
                event = event.split("\n");
                let startremoval = 0;
                let endremoval = 0;
                for (let j = 0; j < event.length; j++) {
                    if (event[j] == "" && startremoval == 0) {
                        startremoval = j;
                    }
                    else if (event[j] == "" && startremoval != 0) {
                        endremoval = j;
                        break;
                    }
                }
                event = event.slice(0, startremoval).concat(event.slice(endremoval + 1));
                let date = event[0].trim().split("/");
                let time = event[2].trim().split(":");
                const start = new Date(parseInt(date[2]),parseInt(date[1])-1,parseInt(date[0]),parseInt(time[0]),parseInt(time[1])).getTime() / 60000;
                date = event[1].trim().split("/");
                time = event[3].trim().split(":");
                const end = new Date(parseInt(date[2]),parseInt(date[1])-1,parseInt(date[0]),parseInt(time[0]),parseInt(time[1])).getTime() / 60000;
                const length = end - start;
                return {
                    time: start,
                    length: length,
                    url: "https://suis.sabanciuniv.edu/prod/" + event[4].substring(event[4].indexOf("href='") + 6, event[4].lastIndexOf("'")),
                };
            });
            rooms[i].events = html;
        }
        else {
            rooms[i].events = [];
        }
        delete rooms[i].eventexists;
    }
    for (let i = 0; i < rooms.length; i++) {
        for (let j = 0; j < rooms[i].events.length; j++) {
            console.log("Fetching details for event " + rooms[i].events[j].url.substring(rooms[i].events[j].url.length - 5) + " of " + rooms[i].room.code + "...");
            let html = await fetch(rooms[i].events[j].url).then(async res => await res.text());
            rooms[i].events[j].code = rooms[i].events[j].url.substring(rooms[i].events[j].url.length - 5);
            delete rooms[i].events[j].url;
            html = html.substring(html.indexOf('<h4>Detailed Information</h4>') + 30);
            html = html.substring(0,html.lastIndexOf("</table>"));
            html = html.substring(0,html.lastIndexOf("</table>")-7);
            let lasttext = "null";
            let repeatcount = 1;
            html = html.substring(html.indexOf("<tr>") + 4).trim().replaceAll("\n", "").replaceAll("&nbsp;", "");
            while (html.includes("  ")) {
                html = html.replaceAll("  ", " ");
            }
            html = html.replaceAll(' <table class="table table-bordered">',"").replaceAll("</tr> <tr>","</tr><tr>").split("</tr><tr>").map(event => {
                event = event.trim();
                let data = event.substring(19).substring(0, event.length - 5).trim().replaceAll("</b> </td>", "</b></td>").split("</b></td>");
                if (data[0] == "") {
                    data[0] = lasttext + repeatcount;
                    repeatcount++;
                }
                else {
                    lasttext = data[0].trim();
                    repeatcount = 2;
                }
                data[1] = data[1].substring(0,data[1].indexOf("</td>")).trim();
                data[1] = data[1].substring(data[1].indexOf(">")+1).trim();
                return data;
            });
            let json = {};
            let briefing = {
                type: "COURSE",
                text: "",
                owner: "",
            };
            for (let k = 0; k < html.length; k++) {
                json[html[k][0].trim()] = html[k][1].trim();
            }
            if (json.CRN && "0123456789".split("").includes(rooms[i].events[j].code[0])) {
                delete json.CRN;
                json.type = "COURSE";
                json.course = {
                    code: json["Course Code"],
                    name: json["Course Title"],
                    instructors: []
                }
                delete json["Course Code"];
                delete json["Course Title"];
                if (json["Instructor(s)"]) json.course.instructors.push(json["Instructor(s)"]);
                delete json["Instructor(s)"];
                let cout = 2;
                while (json["Instructor(s)" + cout]) {
                    json.course.instructors.push(json["Instructor(s)" + cout]);
                    delete json["Instructor(s)" + cout];
                    cout++;
                }
                briefing.text = json.course.code + " - " + json.course.name;
                briefing.owner = json.course.instructors[0];
            }
            else if (json.CRN) {
                delete json.CRN;
                briefing.text = json.Event;
                json.type = "EVENT";
                briefing.type = "EVENT";
                briefing.owner = "";
            }
            else if (json["Event No / Name"]) {
                json.owner = json.Name;
                delete json.Name;
                json.type = "EVENT";
                json.name = json["Event No / Name"].substring(8).trim()
                delete json["Event No / Name"];
                if (json.name == "ADP Akran Oturumları") json.type = "ASP";
                else if (json.name.toLowerCase().includes("make up") || json.name.toLowerCase().includes("exam") || json.name.toLowerCase().includes("makeup") || json.name.toLowerCase().includes("midterm") || json.name.toLowerCase().includes("final")) json.type = "EXAM";
                briefing.text = json.name;
                briefing.owner = json.owner;
            }
            briefing.type = json.type;
            rooms[i].events[j].details = json;
            rooms[i].events[j].brief = briefing;
        }
    }
    let roomsobj = {};
    rooms.forEach(room => {
        roomsobj[room.room.code] = room;
    });
    return roomsobj;
}
async function GetSchedule(day, month, year, eday, emonth, eyear, building) {
    return await fetch("https://suis.sabanciuniv.edu/prod/sabanci_rooms.p_get_all_schedule",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: "s_date=" + day + "%2F" + month + "%2F" + year + "&e_date=" + eday + "%2F" + emonth + "%2F" + eyear + "&buildings=" + building
        }
    ).then(async res => await ParseSchedule(await res.text(), day + "/" + month + "/" + year, eday + "/" + emonth + "/" + eyear, building));
}
async function Start() {
    console.log("Fetching schedule...");
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    const day = start.getDate().toString().padStart(2, '0');
    const month = (start.getMonth() + 1).toString().padStart(2, '0');
    const year = start.getFullYear().toString().substring(2);
    const eday = end.getDate().toString().padStart(2, '0');
    const emonth = (end.getMonth() + 1).toString().padStart(2, '0');
    const eyear = end.getFullYear().toString().substring(2);
    console.log("Fetching schedule for " + day + "/" + month + "/" + year + " to " + eday + "/" + emonth + "/" + eyear);
    const schedule = {};
    const buildings = ["FMAN", "FASS", "FENS", "ALT", "UC", "KCC", "SL", "SUNUM", "SUSAM"]
    for (const building of buildings) {
        console.log("Grabbing schedule for " + building + "...");
        schedule[building] = await GetSchedule(day, month, year, eday, emonth, eyear, building);
    }
    fs.writeFileSync("schedule.json", JSON.stringify(schedule, null, 2));
    console.log("Schedule saved to schedule.json");
}
Start();