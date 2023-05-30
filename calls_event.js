const call = await fetch("https://mysupertestaccount.amocrm.ru/api/v4/calls", {
    method: "POST",
    body: JSON.stringify([{
    "duration": 10,
    "source": "example_integration",
    "phone": "89956151808",
    "direction": "inbound",
    "call_result": "Успешный разговор",
    "call_status": 4,
    "call_responsible": "Шаев Андрей",
    "responsible_user_id": 8736109
    }])
}).then(data=>data.json())
const call1 = await fetch("https://mysupertestaccount.amocrm.ru//api/v4/leads/10764967/notes", {
    method: "POST",
    body: JSON.stringify([
        {
            "note_type": "call_in",
            "params": {
                "uniq": "8f52d38a-5fb3-406d-93a3-a4832dc28f8b",
                "duration": 60,
                "call_status": 4,

                "source": "onlinePBX",
                "link": "https://example.com",
                "phone": "+79999999999"
            }
        }])
}).then(data=>data.json())