const Api = require("./api")
const {call_processing} = require("./data_processing")

const check_answer = async (call, subdomain) => {
    const api = new Api(subdomain)
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
        const notes = await api.getNotes(call, {
            filters:{
                "filter[note_type]": "call_in",
                "filter[updated_at][from]": call.created_at
            }
        }).then(data=> data.json())
        for (let note of notes._embedded.notes) {
            if (note.created_at === call.created_at) {
                if (note.params.call_status === 4 || note.params.call_status === 5) {return}
                const have_answer = await check_answer(call, subdomain)
                !have_answer && call_processing(call, subdomain)
            }
        }
    } catch (error) {
        console.log(error)
        return
    }

}

const send_to_server = async () => {}

const parse_calls = async (subdomain) => {
    const current_time = Math.round(Date.now()/1000)
    const api = new Api(subdomain)
    const events = await api.getEvents({filters:
        {'filter[type]' : "incoming_call",
        "filter[created_at][from]" : current_time-30,
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
    init_requests
}