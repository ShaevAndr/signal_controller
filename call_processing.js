const Api = require("./api")
const d_processing = require("./data_processing_call")
const DB = require("./db").DB
const log4js = require('log4js')
const loger = log4js.getLogger()
loger.level = "debug"

// Переодичность запросов (сек)
const DELAY = 60



let intervals = {}


const check_call = async (call, subdomain) => {
    try{
        loger.debug(`check call ${subdomain}`)

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
                    loger.debug(`check call have answer ${subdomain}`)
                    if (call_in_base) {
                        console.log("check calls удаление из базы")
                        await d_processing.delete_call(call)
                        }
                    return
                }
                
                if (call_in_base) {
                    loger.debug(`check call звонок есть в базе -> выход ${subdomain}`)
                    return
                }

                const have_answer = await d_processing.check_answer(call)
                loger.debug(`check call check answer -> ${have_answer}`)
                
                if (!have_answer) {
                    loger.debug(`check call havent answer and not in base -> ${subdomain}`)
                    const lead = await api.getDeal(call.entity_id, ["contacts"])
                    call.company = null
                    call.group_id = 0
                    console.log(lead._embedded)
                    call.responsible_id = lead.responsible_user_id
                    if (lead._embedded.companies.length) {
                        call.company = lead._embedded.companies[0].id || null
                    }
                    call.contact_id = lead._embedded.contacts[0].id
                    const contact = await api.getUser(call.responsible_id)
                    if (contact.rights.group_id) {
                        call.group_id = contact.rights.group_id || 0
                    }
                    // console.log(call);
                    await d_processing.call_processing(call)
                }
                return
            }
        }
    } catch (error) {
        loger.debug(`check call error -> ${error}`)
        
        return
    }

}


const parse_calls = async (subdomain) => {
    console.log("parse calls start ", subdomain)
    
    const current_time = Math.round(Date.now()/1000)
    const api = new Api(subdomain)
    const events = await api.getEvents(
        {filters:
        {'filter[type]' : "incoming_call",
        "filter[created_at][from]" : current_time-DELAY-10,
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
        loger.debug(`parse calls перебор звонков -> ${subdomain}, входящий звонок тип сущности: ${incoming_calls[i].entity_type}`)
        if (incoming_calls[i].entity_type !== 'lead') {
            continue
        }
        await check_call(incoming_calls[i], subdomain)
    }
}

async function init_requests(subdomain=null){
    if (subdomain) {
        console.log("add intervals")
        intervals[subdomain] = setInterval(parse_calls, DELAY*1000, subdomain)
        return
    }    
    try{
        console.log("start init requestst")
        let subdomains = await DB.get_all_accounts({"installed":true})
        for (let subdomain of subdomains) {
            intervals[subdomain.subDomain] = setInterval(parse_calls, DELAY*1000, subdomain.subDomain)
        }
        console.log("end init requestst")

    } catch (err) {console.log(err)}
}

const delete_timer = (subdomain) => {
    try{
        console.log("delete_timer", subdomain)
        clearInterval(intervals[subdomain])
        d_processing.delete_subdomain_calls(subdomain)
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    init_requests,
    delete_timer
}