

const fetch =  require('node-fetch');
const Logger = require('./logger');
const ImageFetchTimeout = 10000;

const fetchImage = async(link)=>{
  Logger.info("fetching image...");
   return new Promise((resolve)=>{
     let resolved = false;
     setTimeout(()=> {
       if(!resolved){
         Logger.info("Image Fetch Time buffer exceeded..."); 
          resolve(null);
       }
     },ImageFetchTimeout);
       try{
        if(!link) resolve(null);
         fetch(link)
        .then((response) => response.buffer())
        .then((buffer) => {
          // const b64 = buffer.toString('base64');
          Logger.info("image fetched....")
          resolved = true;
          resolve(buffer);
        })
       
       }catch(err){
         Logger.error(err);
         resolved = true;
        resolve(err.message);
       }
    
   }) 
}
module.exports = {fetchImage};