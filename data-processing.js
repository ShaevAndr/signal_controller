const DB = require("./db").DB
const Api = require("./api")
const moment = require('moment-timezone');
const schedule_processiung = require("./schedule_processing")


let first_call = null
let timer = null
let users = {}

const add_call_to_db = async (actions, call) => {
    const is_work_time = schedule_processiung.is_work_time(actions.schedule, call.created_at, actions.timezone)
    let second_to_work = 1
    if (!is_work_time) {
        second_to_work = schedule_processiung.time_to_start_work(actions.schedule, call.created_at, actions.timezone)
    }
    if (!second_to_work) {
        return Promise.resolve()
    }
    call.action_time = (Number(call.created_at) + Number(actions.delay_time) * 60 + second_to_work) * 1000
    call.actions = actions
    call._id = String(Date.now()) + String(Math.floor(Math.random() * 100))
    const result = await DB.add_message(call)
    .then((data)=>{
        if (!first_call || call.action_time < first_call.action_time) {
            if (timer) {
                clearTimeout(timer)
                first_call = call
            }
            set_call_timer(call)
        }
        return data

    })    
    return result 
}

const call_processing = async (call, subdomain) => {
    const user_actions = await DB.find_actions(subdomain, {"manager.id":String(call.created_by)}) || []
    const group_actions = await DB.find_actions(subdomain, {"manager.id":`group_${call.group_id}`}) || []
    const actions = [...user_actions, ...group_actions]
    call.subdomain = subdomain
    if (!actions.length) {
        return
    }
    for (action of actions) {
        const result = await add_call_to_db(action, call)
    }
    return
}

const convert_task_date = (date_string, tz) => {
    // in seconds
    let date = new Date()
    // const offset = get_offset_tz(tz)
    const offset = 3 *3600
    date.setHours(0, 0, 0)
    switch (date_string) {
        case "inMoment":
            return (parseInt(Date.now()/1000))
        case "today":
            return (parseInt(date/1000) + 24*3600) - offset
        case "afterDay":
            return (parseInt(date/1000) + 2*24*3600) - offset
        case "3DayLater":
            return (parseInt(date/1000) + 3*24*3600) - offset
        case "forWeek":
            return (parseInt(date/1000) + 7*24*3600) - offset
    }
}

const set_call_timer = (call) => {
    let delay = 0
    if (call.action_time > Date.now()+1000) {
        delay = call.action_time - Date.now()
    }
    timer = setTimeout(realize_actions, delay, call)
    console.log(delay)
}

const init = async () => {
    let early_call = null
    try{
        early_call = await DB.get_early_call()
    } catch {
        return
    }
    if (!early_call) {
        first_call = null
        return
    }
    first_call = early_call
    set_call_timer(early_call)    
}

const realize_actions = async (call) =>{
    const have_answer = await message_have_answer(message.talk_id, message.subdomain)
    if (have_answer) {
        await delete_talk(message.talk_id, message.subdomain)
        init()
        return
    }
    const api = new Api(message.subdomain)

    if (message.actions.task){
        let responsible_for_leads =  Number(message.actions.task.responsible.id)
        if (responsible_for_leads === -1) {
            responsible_for_leads = message.responsible_id
        }
        await api.createTasks([{
            "entity_id":message.lead_id,
            "entity_type": "leads",
            "task_type_id": message.actions.task.type.id,
            "responsible_user_id": responsible_for_leads,
            "text": message.actions.task.text,
            "complete_till":convert_task_date(message.actions.task.date, message.actions.timezone)
        }]).catch(err=>{console.log(err.response.data)})
        
    }
    if (message.actions.new_responsible){
        await api.updateDeals({
            "id":message.lead_id,
            "responsible_user_id": Number(message.actions.new_responsible.id)
        }).catch(err=>{console.log(err.response.data)})
    }
    if (message.actions.tags){
        let tags = message.actions.tags.map(tag=>{return{"name":tag.name}})
        const lead = await api.getDeal(message.lead_id)
        let lead_tags, company_tags, contact_tags
        
        
        if (lead._embedded.tags.length) {
            lead_tags = lead._embedded.tags.map(tag=>{return {name: tag.name}})
        }
        await api.updateDeals({
            "id":message.lead_id,
            "_embedded": {
                "tags": [...tags, ...lead_tags || []]
            }
        }).catch(err=>{console.log(err.response.data)})

        if(message.actions.tag_on_contact) {
            const contact = await api.getContact(Number(message.contact_id))
            if (contact._embedded.tags.length) {
                contact_tags = contact._embedded.tags.map(tag=>{return {name: tag.name}})
            }
            await api.updateContacts({
                "id":Number(message.contact_id),
                "_embedded": {
                    "tags": [...contact_tags || [], ...tags]
                }
            }).catch(err=>{console.log(err.response.data)})
        }
        if(message.actions.tag_on_company && message.company) {
            const company = await api.getCompany(Number(message.company))
            if (company._embedded.tags.length) {
                company_tags = company._embedded.tags.map(tag=>{return {name: tag.name}})
            }
            await api.updateCompany({
                "id":Number(message.company),
                "_embedded": {
                    "tags": [...company_tags || [], ...tags]
                }
            }).catch(err=>{console.log(err.response.data)})
        }
    }
    if (message.actions.notice){

        if (users[message.responsible_id]){
            users[message.responsible_id].write("event: notification\n")
            users[message.responsible_id].write(`data:${message.actions.notice} \n\n`)
            users[message.responsible_id].end()
        }
    }
    await DB.delete_message({"_id":message._id})
    init()
}
