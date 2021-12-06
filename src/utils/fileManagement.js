let fs = require('fs');
const {News,Sports,Business} = require('../schema/post.schema');
const Logger = require('./logger');

const saveLocally =  async (data, filename) => {

    Logger.info(`saving file locally -${filename}`);
    new Promise((resolve) => {


        fs.writeFile(`data/${filename}.json`, JSON.stringify(data), function (err) {

            if(err){
                console.error("Data not saved Locally : ", err);
                resolve( {error : true});
            } else {
                console.log("Data Saved Locally !!!");
                resolve( {error : false });
            }

        });

    })
}
const saveToDatabase = async(data)=>{
    Logger.info("saving to database...");
    return new Promise(async(resolve)=>{
        try{

            if(data.category.includes("business")){
                for(let i=0;i<data.posts.length;i++){
                    const doc = new Business(data.posts[i]);
                    const savedData = await  doc.save();
                    Logger.info("saved to mongo db - ", savedData);
                }
               
            }else if(data.category.includes("news")){
                for(let i=0;i<data.posts.length;i++){
                    const doc = new News(data.posts[i]);
                    const savedData = await  doc.save();
                    Logger.info("saved to mongo db - ", savedData);
                }
                
            } else if(data.category.includes("sports")){
                for(let i=0;i<data.posts.length;i++){
                    const doc = new Sports(data.posts[i]);
                    const savedData = await  doc.save();
                    Logger.info("saved to mongo db - ", savedData);
                }
            }
            Logger.info("DATA SAVED TO MONGO");
            resolve({error:false});
        }catch(e){
            Logger.error(e.message);
            resolve(e);
        }
    })
}

module.exports = {saveLocally,saveToDatabase};