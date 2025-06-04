const fs = require("fs");
const fetch = require("node-fetch");

async function ParseSchedule(schedule) {
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
        room = room.substring(room.indexOf("</td>") + 88);
        room = room.substring(0, room.length - 25);
        room = room.split("\n");
        room.pop();
        room = room.map(event => {
            return event.substring(event.indexOf("href=") + 39, event.indexOf('">'));
        });
        const url = (room.length == 0)? null : "https://suis.sabanciuniv.edu/prod/sabanci_rooms.p_response_2_2_new?"+ room[0].substring(0, room[0].indexOf('&s_time'));
        room = room.map(event => {
            return event.substring(event.indexOf("&s_time=") + 8)
        })
        return {
            room: {
                code: roomcode,
                name: roomname,
                type: roomtype,
                capacity: capacity,
            },
            eventurl: url,
            events: room,
        }
    });
    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].eventurl != null) {
            console.log("Fetching events for " + rooms[i].room.code + "...");
            let html = await fetch(rooms[i].eventurl).then(async res => await res.text());
            const date = rooms[i].eventurl.substring(rooms[i].eventurl.indexOf("s_date=") + 7, rooms[i].eventurl.indexOf("&e_date=")).split("/");
            delete rooms[i].eventurl;
            html = html.substring(html.indexOf('<h4>Schedule Detail</h4>') + 26);
            html = html.substring(html.indexOf('<td><b>DETAIL</b></td>') + 30);
            html = html.substring(html.indexOf('</tr>') + 5);
            html = html.substring(0, html.indexOf('</table>'));
            html = html.split("<tr>\n");
            html.shift();
            html = html.map(event => {
                event = event.substring(event.indexOf("</td>") + 5);
                event = event.substring(event.indexOf("</td>") + 10);
                const start = event.substring(0, event.indexOf("</td>")).trim().split(":");
                event = event.substring(event.indexOf("</td>") + 10);
                const end = event.substring(0, event.indexOf("</td>")).trim().split(":");
                event = event.substring(event.indexOf("</td>") + 10);
                event = event.substring(event.indexOf("</td>") + 10);
                event = event.substring(event.indexOf("href='") + 6);
                const url = "https://suis.sabanciuniv.edu/prod/" + event.substring(0, event.indexOf("'"));
                const startTS = new Date(parseInt("20"+date[2]), parseInt(date[1] - 1), parseInt(date[0]), parseInt(start[0]), parseInt(start[1]));
                const endTS = new Date(parseInt("20"+date[2]), parseInt(date[1] - 1), parseInt(date[0]), parseInt(end[0]), parseInt(end[1]));
                const length = endTS.getTime() - startTS.getTime();
                return {
                    time: startTS.getTime() / 60000,
                    length: length / 60000,
                    url: url,
                };
            });
            rooms[i].events = html;
        }
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
            html = html.replaceAll("</tr> <tr>","</tr><tr>").split("</tr><tr>").map(event => {
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
            else if (json.CRN) { //FIX THIS BUG
                console.log(json);
                delete json.CRN;
                briefing.text = "Unknown Event";
                json.type = "EVENT";
                briefing.type = "EVENT";
                briefing.owner = "";
            }
            else if (json["Event No / Name"]) {
                json.owner = json.Name;
                delete json.Name;
                json.type = "EVENT";
                json.name = json["Event No / Name"].substring(8).trim().replaceAll("�", "ü").replaceAll("?", "ı");
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
async function GetSchedule(day, month, year, building) {
    return await fetch("https://suis.sabanciuniv.edu/prod/sabanci_rooms.p_get_all_schedule",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: "s_date=" + day + "%2F" + month + "%2F" + year + "&e_date=" + day + "%2F" + month + "%2F" + year + "&buildings=" + building
        }
    ).then(async res => await ParseSchedule(await res.text()));
}
async function Start() {
    console.log("Fetching schedule...");
    const day = "04";
    const month = "06";
    const year = "25";
    const schedule = {};
    const buildings = ["FMAN", "FASS", "ALT", "FENS", "UC", "KCC", "SL", "SUNUM", "SUSAM"]
    for (const building of buildings) {
        console.log("Grabbing schedule for " + building + "...");
        schedule[building] = await GetSchedule(day, month, year, building);
    }
    const nextday = {};
    for (const building of buildings) {
        console.log("Grabbing schedule for " + building + "...");
        nextday[building] = await GetSchedule(((parseInt(day)+1<10)?"0":"")+(parseInt(day)+1), month, year, building);
    }
    for (const building of buildings) {
        for (const room in nextday[building]) {
            for (const event of nextday[building][room].events) {
                schedule[building][room].events.push(event);
            }
        }
    }
    fs.writeFileSync("schedule.json", JSON.stringify(schedule, null, 2));
    console.log("Schedule saved to schedule.json");
}
Start();