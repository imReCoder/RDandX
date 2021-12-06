const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const fullDescriptionSchema = new Schema({
    authorName:{
        type:String
    },
    postDate:{
        type:String
    },
    descArray:{
        type:[String]
    }
})

const postSchema = new Schema({
    link:{
        type:String
    },
    title:{
        type:String
    },
    imgLink:{
        type:String
    },
    imgBuffer:{
        type:Buffer
    },
    briefDesc:{
        type:String
    },
    fullDescription:{
        type:fullDescriptionSchema
    }
})

const Sports = mongoose.model('Sports',postSchema);
const News = mongoose.model('News',postSchema);
const Business = mongoose.model('Business',postSchema);

module.exports = {Sports,News,Business};