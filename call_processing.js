const Api = require("./api")
const d_processing = require("./data_processing")
const DB = require("./db").DB

// Переодичность запросов (сек)
const DELAY = 30



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
        console.log("notes:", notes._embedded.notes)
        const call_in_base = await DB.find_call({'entity_id':call.entity_id, 'subdomain':call.subdomain})
        console.log("call in base : ", call_in_base)
        // console.log(notes._embedded);
        for (let note of notes._embedded.notes) {
            if (note.created_at === call.created_at) {
                if (note.params.call_status === 4 || note.params.call_status === 5) {
                    if (call_in_base) {
                        await d_processing.delete_call(call)
                        }
                    return
                }

                const have_answer = await d_processing.check_answer(call)
                console.log("have answer", have_answer)
                if (!have_answer) {
                    console.log("havent answer and not in base");
                    const responsible = await api.getDeal(call.entity_id)
                        .then(data=>data.responsible_user_id)
                    call.responsible_id = responsible
                    const contact = await api.getUser(responsible)
                    const group_id = contact.rights.group_id
                    call.group_id = group_id
                    // console.log(call);
                    // await d_processing.call_processing(call)
                }
                return
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
    
    // console.log(events._embedded.events);
    const incoming_calls = events._embedded.events
    if (!incoming_calls.length){
        console.log("нет звонков");
        return
    }
    for (let i=incoming_calls.length-1; i>=0; i--) {
        await check_call(incoming_calls[i], subdomain)
    }
}

async function init_requests(){
    try{
        let subdomains = await DB.get_all_accounts()
        for (let subdomain of subdomains) {
            intervals[subdomain.subDomain] = setTimeout(parse_calls, 1000, subdomain.subDomain)
        }
        // console.log(intervals)
    } catch (err) {console.log(err)}
}

module.exports = {
    init_requests,
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