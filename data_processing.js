const DB = require("./db").DB
const Api = require("./api")
const moment = require('moment-timezone');
const schedule_processiung = require("./schedule_processing")
const log4js = require('log4js')
const loger = log4js.getLogger()
loger.level = 'debug'

let first_call = null
let timer = null
let users = {}

const delete_subdomain_calls = async (subdomain) => {
    await DB.delete_calls({"subdomain":subdomain})
    init()
}

const check_answer = async (call) => {
    const api = new Api(call.subdomain)
    const notes = await api.getNotes(call, {
        filters:{
            "filter[note_type]": ["call_out", "call_in"],
            "filter[updated_at][from]": call.created_at
        }})
    if (!notes) {
        return false
    }
    for (let note of notes._embedded.notes) {
        if (note.params.call_status === 4 || note.params.call_status === 5 || note.note_type === "call_out") {
            return true
        }
    }
    return false
}

const delete_call = (call) => {
    console.log("delete_call start")
    DB.delete_calls({"entity_type":call.entity_type, "entity_id":call.entity_id, "subdomain":call.subdomain})
    .then(()=>{
        console.log("delete call first message", first_call._id, call._id)
        if (!first_call) {
            return
        }
        if (first_call.entity_type === call.entity_type && first_call.entity_id === call.entity_id) {
            clearTimeout(timer)
            first_call = null
            init()
        }
    })
    .catch(err => {console.log("data_proccesing error delete_talk", err)})
}

const add_call_to_db = async (actions, call) => {
    loger.debug(`add_call_to_db start ${call.created_at}  created at`);

    // console.log("add_call_to_db start ", call.created_at, "created at")
    const api = new Api(call.subdomain)
    const is_work_time = schedule_processiung.is_work_time(actions.schedule, call.created_at, actions.timezone)
    let second_to_work = 1

    // console.log("is workTime: ", is_work_time)
    if (!is_work_time) {
        second_to_work = schedule_processiung.time_to_start_work(actions.schedule, call.created_at, actions.timezone)
    }
    
    // console.log("second to work: ", second_to_work)
    loger.debug(`second to work:  ${second_to_work}`);

    // if (!second_to_work) {
    //     return Promise.resolve()
    // }
    call.action_time = (Number(call.created_at) + Number(actions.delay_time) * 60 + second_to_work) * 1000
    call.actions = actions
    call._id = String(Date.now()) + String(Math.floor(Math.random() * 100))
    const lead = await api.getDeal(call.entity_id)
    if (lead._embedded.companies.length) {
        call.company = lead._embedded.companies[0].id
    }
    call.responsible_id = lead.responsible_user_id
    // call.group_id = lead.group_id
    console.log("add call to db from add to base. Call responsible", call.responsible_id)

    const result = await DB.add_call(call)
    .then((data)=>{
        if (!first_call || call.action_time < first_call.action_time) {
            if (timer) {
                clearTimeout(timer)
            }
            first_call = Object.assign({}, call)
            set_call_timer(call)
        }
        return data

    })    
    return result 
}

const call_processing = async (call) => {
    loger.debug("call processing start")
    // const user_actions = await DB.find_actions(call.subdomain, {"manager.id":String(call.responsible_id)}) || []
    // const group_actions = await DB.find_actions(call.subdomain, {"manager.id":`group_${call.group_id}`}) || []

    const user_actions = await DB.find_actions(call.subdomain, {"manager":{$elemMatch:{"id":String(call.responsible_id)}}}) || []
    const group_actions = await DB.find_actions(call.subdomain, {"manager":{$elemMatch:{"id":`group_${call.group_id}`}}}) || []
    const actions = [...user_actions, ...group_actions]
    loger.debug(`call pr. actions length ${actions.length}`);
    if (!actions.length) {
        console.log("call pr. нет условий");
        return
    }
    for (let action of actions) {
        loger.debug(`call pr. loop for add_call_to_db ${action._id}`);
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
    loger.debug("set call timer start")
    let delay = 0
    if (call.action_time > Date.now()+1000) {
        delay = call.action_time - Date.now()
    }
    // timer = setTimeout(realize_actions, delay, call)
    timer = setTimeout(realize_actions, delay, call)
    loger.debug(`set call timer start delay ${delay}`)
}

const init = async () => {
    loger.debug("init")
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
    first_call = Object.assign({}, early_call)
    set_call_timer(early_call)    
}

const realize_actions = async (call) =>{
    loger.debug("realize_actions start")
    const have_answer = await check_answer(call)
    if (have_answer) {
        await delete_call(call)
        loger.debug("delete call from realize_action")
        // init()
        return
    }
    const api = new Api(call.subdomain)

    try {
        if (call.actions.task){
        let responsible_for_leads =  Number(call.actions.task.responsible.id)
        if (responsible_for_leads === -1) {
            responsible_for_leads = call.responsible_id
        }
        await api.createTasks([{
            "entity_id":call.entity_id,
            "entity_type": "leads",
            "task_type_id": call.actions.task.type.id,
            "responsible_user_id": responsible_for_leads,
            "text": call.actions.task.text,
            "complete_till":convert_task_date(call.actions.task.date, call.actions.timezone)
        }]).catch(err=>{console.log(err.response.data)})
        
        }
        if (call.actions.new_responsible){
            await api.updateDeals({
                "id":call.entity_id,
                "responsible_user_id": Number(call.actions.new_responsible.id)
            }).catch(err=>{console.log(err.response.data)})
        }
        if (call.actions.tags){
            let tags = call.actions.tags.map(tag=>{return{"name":tag.name}})
            const lead = await api.getDeal(call.entity_id)
            let lead_tags, company_tags, contact_tags
            
            
            if (lead._embedded.tags.length) {
                lead_tags = lead._embedded.tags.map(tag=>{return {name: tag.name}})
            }
            await api.updateDeals({
                "id":call.entity_id,
                "_embedded": {
                    "tags": [...tags, ...lead_tags || []]
                }
            }).catch(err=>{console.log(err.response.data)})

            if(call.actions.tag_on_contact) {
                const contact = await api.getContact(Number(call.contact_id))
                if (contact._embedded.tags.length) {
                    contact_tags = contact._embedded.tags.map(tag=>{return {name: tag.name}})
                }
                await api.updateContacts({
                    "id":Number(call.contact_id),
                    "_embedded": {
                        "tags": [...contact_tags || [], ...tags]
                    }
                }).catch(err=>{console.log(err.response.data)})
            }

            if(call.actions.tag_on_company && call.company) {
                const company = await api.getCompany(Number(call.company))
                if (company._embedded.tags.length) {
                    company_tags = company._embedded.tags.map(tag=>{return {name: tag.name}})
                }
                await api.updateCompany({
                    "id":Number(call.company),
                    "_embedded": {
                        "tags": [...company_tags || [], ...tags]
                    }
                }).catch(err=>{console.log(err.response.data)})
            }
        }
        if (call.actions.notice){
            if (users[call.responsible_id]){
                users[call.responsible_id].write(`data:${call.actions.notice}\n\n`);
                // users[call.responsible_id].write(`data:${call.actions.notice}\n\n`)
                // users[call.responsible_id].end()
            }
        }
    } catch (err) {
        loger.debug(`error from realize_action ${error}`)

    } finally {
        await DB.delete_calls({"_id":call._id})
        init()
    }
}

const add_client = (client) => {
    users[client.id] = client.res
}

module.exports = {
    add_client,
    init,
    call_processing, 
    check_answer,
    delete_call,
    delete_subdomain_calls
};

