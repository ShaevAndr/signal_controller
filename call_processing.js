const Api = require("./api")
const d_processing = require("./data_processing")
const DB = require("./db").DB

// Переодичность запросов (сек)
const DELAY = 30



let intervals = {}


const check_call = async (call, subdomain) => {
    try{
        console.log("check calls start")

        const api = new Api(subdomain)
        call.subdomain = subdomain
        const notes = await api.getNotes(call, {
            filters:{
                "filter[note_type]": "call_in",
                "filter[updated_at][from]": call.created_at-10
            }
        })
        // console.log("notes:", notes._embedded.notes)
        const call_in_base = await DB.find_call({'entity_id':call.entity_id, 'subdomain':call.subdomain})
        // console.log(notes);
        if (!notes) {return}
        for (let note of notes._embedded.notes) {
            console.log("check calls перебор записей")

            if (note.created_at === call.created_at) {
                if (note.params.call_status === 4 || note.params.call_status === 5) {
                    console.log("check calls есть ответ")
                    if (call_in_base) {
                        console.log("check calls удаление из базы")
                        await d_processing.delete_call(call)
                        }
                    return
                }
                
                if (call_in_base) {
                    console.log("звонок есть в базе -> выход")
                    return
                }

                const have_answer = await d_processing.check_answer(call)
                console.log("have answer", have_answer)
                if (!have_answer) {
                    console.log("check call havent answer and not in base");
                    const lead = await api.getDeal(call.entity_id, ["contacts"])
                        .then(data=>data.responsible_user_id)
                    call.responsible_id = lead.responsible_user_id
                    call.company = lead._embedded.companies[0].id
                    call.contact = lead._embedded.contacts[0].id
                    const contact = await api.getUser(responsible)
                    call.group_id = contact.rights.group_id || 0
                    // console.log(call);
                    await d_processing.call_processing(call)
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
    console.log("parse calls start ")
    
    const current_time = Math.round(Date.now()/1000)
    const api = new Api(subdomain)
    const events = await api.getEvents(
        {filters:
        {'filter[type]' : "incoming_call",
        "filter[created_at][from]" : current_time-DELAY,
        "filter[created_at][to]" : current_time
    }}
    )
    if (!events) { 
        console.log("нет новых звонков Parse_calls");
        return 
    }
    
    const incoming_calls = events._embedded.events
    if (!incoming_calls.length){
        console.log("нет звонков");
        return
    }
    for (let i=incoming_calls.length-1; i>=0; i--) {
        console.log("parse calls перебор звонков")
        if (incoming_calls[i].entity_type !== 'lead') {
            continue
        }
        await check_call(incoming_calls[i], subdomain)
    }
}

async function init_requests(){
    try{
        console.log("start init requestst")
        let subdomains = await DB.get_all_accounts()
        for (let subdomain of subdomains) {
            intervals[subdomain.subDomain] = setInterval(parse_calls, DELAY*1000, subdomain.subDomain)
        }
        console.log("end init requestst")

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