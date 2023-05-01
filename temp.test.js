const testFile = require("./temp")

describe('testing test file', ()=>{
    test("litle 5", ()=>{
        expect(testFile.testFunc(3)).toBe(false)
    })
    test("bigger 5", ()=>{
        expect(testFile.testFunc(6)).toBe(true)

    })
    test("equal 5", ()=>{
        expect(testFile.testFunc(5)).toBe(false)
        
    })
})