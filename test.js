// const querystring = require("querystring");

// const req = (entity, { page = 1, limit = 10, filters }) => {
//     const url = `/api/v4/${entity}?${querystring.stringify({
//       page,
//       limit,
//       ...filters,
//     })}`;
//     console.log(
//   url
//       )
//   }

// req("lead", {page:1, limit:1, filters:{"filter[from]":40, "filter[to]":60} })

let a = 5

function x () {
  this.zzz= function() {
    console.log(this)
  }
  console.log("x", this)

}
const z = {
  u : 234,
  y: function () {
    console.log("y", this.u)
  }
  
}
x.zzz()
z.y()