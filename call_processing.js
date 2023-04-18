const Api = require("./api")
const {call_processing} = require("./data_processing_old")

// Переодичность запросов (сек)
const DELAY = 30

const check_answer = async (call) => {
    const api = new Api(call.subdomain)
    const notes = await api.getNotes(call, {
        filters:{
            "filter[note_type]": "call_out",
            "filter[updated_at][from]": call.created_at
        }})
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
                "filter[updated_at][from]": call.created_at
            }
        }).then(data=> data.json())
        for (let note of notes._embedded.notes) {
            if (note.created_at === call.created_at) {
                if (note.params.call_status === 4 || note.params.call_status === 5) {return}
                const have_answer = await check_answer(call)
                if (!have_answer) {
                    // const contact = await api.getContact(call.created_by)
                    // const group_id = contact.group_id
                    // call.group_id = group_id
                    await call_processing(call)
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
    const events = await api.getEvents({filters:
        {'filter[type]' : "incoming_call",
        "filter[created_at][from]" : current_time-DELAY,
        "filter[created_at][to]" : current_time
    }}).then(data=> data.json())

    const incoming_calls = events._embedded.events
    console.log(incoming_calls);
    if (!incoming_calls.length){
        return
    }
    for (const call of incoming_calls) {
        await check_call(call, subdomain)
    }
    
}

function init_requests(subdomain){
    intervals.subdomain = setInterval(parse_calls, 30000, subdomain)
}

module.exports = {
    init_requests,
    check_answer
}