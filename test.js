const querystring = require("querystring");

const req = (entity, { page = 1, limit = 10, filters }) => {
    const url = `/api/v4/${entity}?${querystring.stringify({
      page,
      limit,
      ...filters,
    })}`;
    console.log(
  url
      )
  }

req("lead", {page:1, limit:1, filters:{"filter[from]":40, "filter[to]":60} })