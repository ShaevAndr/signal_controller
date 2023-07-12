let users = {}

const add_client = (client) => {
    users[client.id] = client.res
}

const remove_client = () => {
    delete users[client.id]
}

module.exports = {
    users,
    add_client,
    remove_client
}