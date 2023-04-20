const Api = require("./api")
const d_processing = require("./data_processing")

// Переодичность запросов (сек)
const DELAY = 30

const check_answer = async (call) => {
    const api = new Api(call.subdomain)
    const notes = await api.getNotes(call, {
        filters:{
            "filter[note_type]": "call_out",
            // "filter[updated_at][from]": call.created_at
        }})
    if (!notes) return false
        console.log("check_answer ", notes._embedded.notes || "net otveta");
    return notes._embedded.notes.length ?  true : false
}

let intervals = {}

const check_call = async (call, subdomain) => {
    try{
        const api = new Api(subdomain)
        call.subdomain = subdomain
        const notes = await api.getNotes(call, {
            filters:{
                "filter[note_type]": "call_in",
                // "filter[updated_at][from]": call.created_at
            }
        })
        console.log(notes._embedded);
        for (let note of notes._embedded.notes) {
            if (note.created_at === call.created_at) {
                if (note.params.call_status === 4 || note.params.call_status === 5) {return}
                const have_answer = await check_answer(call)
                if (!have_answer) {
                    // const contact = await api.getContact(call.created_by)
                    // const group_id = contact.group_id
                    // call.group_id = group_id
                    console.log("check_call", call.created_by);
                    console.log(d_processing);

                    // await d_processing.call_processing(call)
                }
            }
        }
    } catch (error) {
        console.log(error)
        return
    }

}


const parse_calls = async (subdomain) => {
    const current_time = Math.round(Date.now()/1000)
    const api = new Api(subdomain)
    const events = await api.getEvents(
        {filters:
        {'filter[type]' : "incoming_call",
    //     "filter[created_at][from]" : current_time-DELAY,
    //     "filter[created_at][to]" : current_time
    }}
    )
    if (!events) { 
        return 
    }
    
    console.log(events._embedded.events);
    const incoming_calls = events._embedded.events
    if (!incoming_calls.length){
        console.log("нет звонков");
        return
    }
    for (const call of incoming_calls) {
        await check_call(call, subdomain)
    }
    
}

function init_requests(subdomains){
    for (let subdomain of subdomains) {
        console.log(subdomain);
        intervals[subdomain] = setTimeout(parse_calls, 5000, subdomain)
    }
    // console.log(intervals)
}

module.exports = {
    init_requests,
    check_answer
}

// const call = await fetch("https://mysupertestaccount.amocrm.ru/api/v4/calls", {
//     method: "POST",
//     body: JSON.stringify([{
//     "duration": 10,
//     "source": "example_integration",
//     "phone": "123123",
//     "direction": "inbound",
//     "call_result": "Успешный разговор",
//     "call_status": 4,
//     "call_responsible": "Шаев Андрей",
//     "responsible_user_id": 8736109
//     }])
// }).then(data=>data.json())
// const call = await fetch("https://mysupertestaccount.amocrm.ru//api/v4/leads/10764967/notes", {
//     method: "POST",
//     body: JSON.stringify([
//         {
//             "note_type": "call_in",
//             "params": {
//                 "uniq": "8f52d38a-5fb3-406d-93a3-a4832dc28f8b",
//                 "duration": 60,
//                 "call_status": 4,

//                 "source": "onlinePBX",
//                 "link": "https://example.com",
//                 "phone": "+79999999999"
//             }
//         }])
// }).then(data=>data.json())