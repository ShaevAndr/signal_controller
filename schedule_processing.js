const moment = require('moment-timezone');

const is_work_time = (schedule, message_create, tz) => {
    const message_was_recieved = moment.unix(message_create).tz(tz)
    const message_day = message_was_recieved.format("dddd")
    const message_time = message_was_recieved.format("HH:mm")
    for (day of schedule) {
        if (day.day !== message_day) {
            continue
        }
        if (!day.checked) {
            return false
        }
        if(message_time>day.from && message_time<day.to){
            return true
        }
    }
    return false
}

const time_to_start_work = (schedule, message_create, tz) => {
    const message_was_recieved = moment.unix(message_create).tz(tz)
    let is_evening = false
    for (let i=0; i<7; i++) {
        const temp_day = message_was_recieved.clone().add(i, "day")
        console.log(temp_day.format('dddd'))
        for (day of schedule) {
            if (day.day === temp_day.format("dddd")) { 
                if (!day.checked) {
                    is_evening = true
                    break
                }
                if (!is_evening && message_was_recieved.format("HH:mm")>day.to) {
                    console.log("day: ", day.day, "переключаем в вечер")
                    is_evening = true
                    break
                }
                const [hour_from, minute_from ]= day.from.split(":")
                temp_day.set('hour', hour_from)
                temp_day.set('minute', minute_from)
                return temp_day.unix() - message_was_recieved.unix()
            }

        }
    }
    // return
}

module.exports = {
    is_work_time,
    time_to_start_work
}
