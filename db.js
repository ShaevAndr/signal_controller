const MongoClient = require("mongodb").MongoClient
const url = "mongodb://127.0.0.1:27017/";

const base_name = "income_signal_control"
const mongoClient = new MongoClient(url, {
    useUnifiedTopology: true,
    pkFactory: { createPk: () =>  {
        const id = String(Date.now()) + String(Math.floor(Math.random() * 100))
        console.log(id)
        return id
    } }}
  )

class DB {
    static async add_action (table, data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection(table)
            const result = await collection.insertOne(data)
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    
    static async find_actions (table, data) {
        try{
            console.log("db 31")
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection(table)
            const result = await collection.find(data)
            const actions = await result.toArray();
            return actions
        }catch(error) {
            console.log(error)
            return []
        }finally{
            await mongoClient.close();
        }
    }
    
    static async delete_action (table, id) {
        try{
            await mongoClient.connect();
            const db = await  mongoClient.db(base_name);
            const collection = await db.collection(table)
            const result = await collection.deleteOne({_id:id});
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async change_action (table, data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection(table)
            const result = await collection.replaceOne({_id:data._id}, data);
            console.log(result)
            return result
        }catch(error) {
            console.log(error)
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async get_all_actions (table) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection(table);
            const result = collection.find();
            const all_actions = await result.toArray();
            return all_actions;
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async get_all_accounts (data={}) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("accounts");
            const result = collection.find(data);
            const all_accounts = await result.toArray();
            return all_accounts;
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async get_action_by_id (table, id) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection(table);
            const result = await collection.findOne({_id:id});
            return result;
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async add_account (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("accounts")
            const result = await collection.insertOne(data)
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    static async get_account_by_subdomain (subDomain) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("accounts")
            const result = await collection.findOne({"subDomain":subDomain})
            return result
        }catch(error) {
            return null
        }finally{
            await mongoClient.close();
        }
    }
    
    static async find_account (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("accounts")
            const result = await collection.findOne(data)
            return result
        }catch(error) {
            return null
        }finally{
            await mongoClient.close();
        }
    }
    
    static async update_account_by_subdomain (subDomain, new_data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("accounts")
            const result = await collection.updateOne({subDomain:subDomain}, {$set:new_data})
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    

    static async add_call (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("calls")
            const result = await collection.insertOne(data)
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }

    // Звонки
    static async find_call (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("calls");
            const result = collection.find(data);
            const all_messages = await result.toArray();
            return all_messages.length ? all_messages : null;
        }catch(error) {
            return null
        }finally{
            await mongoClient.close();
        }
    }
    
    static async get_early_call() {
        try{
            await mongoClient.connect();
            const db = await  mongoClient.db(base_name);
            const collection = await db.collection("calls");
            const result = collection.find().sort({created_at:1}).limit(1);
            const early_message = await result.toArray();
            return early_message[0];
        }catch(error) {
            return null
        }finally{
            await mongoClient.close();
        }
    }

    static async delete_calls (data) {
        try{
            await mongoClient.connect();
            const db = await  mongoClient.db(base_name);
            const collection = await db.collection("calls")
            await collection.deleteMany(data);
            return 
        }catch
        {
            console.log("ошибка в базе")
        }finally{
            await mongoClient.close();
        }
    }

    // Сообщения
    static async add_message (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("messages")
            const result = await collection.insertOne(data)
            return result
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }

    static async find_message (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("messages");
            const result = collection.find(data);
            const all_messages = await result.toArray();
            return all_messages;
        }catch(error) {
            return {error}
        }finally{
            await mongoClient.close();
        }
    }
    
    static async get_early_message() {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("messages");
            const result = await collection.find().sort({action_time:1}).limit(1);
            const early_message = await result.toArray();
            return Promise.resolve(early_message[0]);
        }catch(error) {
            return null
        }finally{
            await mongoClient.close();
        }
    }

    static async delete_message (data) {
        try{
            await mongoClient.connect();
            const db = await mongoClient.db(base_name);
            const collection = await db.collection("messages")
            await collection.deleteMany(data);
            return Promise.resolve("message was deletting seccessfull")
        }catch{
            return null
        
        }finally{
            await mongoClient.close();
        }
    }
}

module.exports = {
	DB
};