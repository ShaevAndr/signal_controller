const d_processing = require("./data_processing")
const Api = require("./api")
jest.mock('./api')

describe('Тестирование check_answer', ()=>{
    test("проверка наличия ответа (ответ есть)", async ()=> {
        const notes = {data:"dsfc"}
        Api.getNotes.mockImplementation(() => Promise.resolve(notes))
        expect( d_processing.check_answer("sdf")).toBe(false)

    })
    // test("проверка наличия ответа (ответа нет)", ()=> {})

})