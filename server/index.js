const express=require('express');
const mongoose=require('mongoose');
const dotenv=require('dotenv'); 
const User=require('./Models/user');
const jwt=require('jsonwebtoken');
const cors=require('cors');
const cookieParser = require('cookie-parser');
const bcrypt=require('bcryptjs');
const ws=require('ws');
const Message=require('./Models/message');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const {S3Client}=require('@aws-sdk/client-s3');
const bucket='mern-chat-app2'

dotenv.config();
const jwtsecret=process.env.JWT_SECRET;
const bcryptsalt=bcrypt.genSaltSync(10)
const app=express();
app.use(express.json());
app.use(cors({
    credentials:true,
    origin:process.env.CLIENT_URL

}))
app.use(cookieParser());
app.get('/',(req,res)=>{
    res.json('test ok');
})


async function  uploadToS3(originalFilename,buffer,mimetype){
    const client=new S3Client({
        region:'eu-north-1',
        credentials:{
            accessKeyId:process.env.S3_ACCESS_KEY,
            secretAccessKey:process.env.S3_SECRET_ACCESS_KEY
        }
    });
      await client.send(new PutObjectCommand({
            Bucket:bucket,
            Body:buffer,
            Key:originalFilename,
            ContentType:mimetype,
            ACL:'public-read',

        }));
        return `https://${bucket}.s3.amazonaws.com/${originalFilename}`;

    } 
       





function getUserDataFromRequest(req){
    mongoose.connect(process.env.MONGO_URL);
    return new Promise((resolve,reject)=>{
        const token=req.cookies?.token;
        if(token){
            jwt.verify(token,jwtsecret,{},(err,userData)=>{
                if(err) throw err;
                resolve(userData)
    
            })
        }
        else{
            reject('no token')
        }

    })

}

app.get('/people',async(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
   const users = await User.find({},{'_id':1,username:1})
   res.json(users);
})


app.get('/profile',(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    const token=req.cookies?.token;
    if(token)
    {
        jwt.verify(token,jwtsecret,{},(err,userData)=>{
            if(err) throw err;
            res.json(userData);
        })  
    }else{
        res.status(401).json('no token');
    }

})

app.get('/messages/:userId',async (req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    const {userId}=req.params;
    const userData= await getUserDataFromRequest(req);
    const ourUserId=userData.userId;
    const messages=await Message.find({
        sender:{$in:[userId,ourUserId]},
        recipient:{$in:[userId,ourUserId]}
    }).sort({createdAt:1});
    res.json(messages);


})


app.post('/login',async(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    const{username,password}=req.body;
    const foundUser=await User.findOne({username})
    if(foundUser){
       const passok= bcrypt.compareSync(password,foundUser.password);
       if(passok){
        jwt.sign({userId:foundUser._id,username},jwtsecret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token,{sameSite:'none',secure:true}).json({
                id:foundUser._id,
            })
        })
       }
    }
})


app.post('/logout',(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    res.cookie('token','',{sameSite:'none',secure:true}).json('ok');
})


app.post('/register',async(req,res)=>{
    mongoose.connect(process.env.MONGO_URL);
    const{username,password}=req.body;
    try{
        const hashedPassword=bcrypt.hashSync(password,bcryptsalt)
        const createdUser=await User.create({username:username,password:hashedPassword});
        jwt.sign({userId:createdUser._id,username},jwtsecret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token,{sameSite:'none',secure:true}).status(201 ).json({
                id:createdUser._id,

            });
    
        })
    }catch(err){
        if(err) throw err;

    }
   


})

const server=app.listen(4040);

const wss=new ws.WebSocketServer({server});
wss.on('connection',(connection,req)=>{
    mongoose.connect(process.env.MONGO_URL);
    // read usenrame and id from cookie for this connection

   function notifyAboutOnlinePeople(){
    [...wss.clients].forEach(client=>{
        client.send(JSON.stringify({
           online: [...wss.clients].map(c=>({userId:c.userId,username:c.username}))}
        ))
       })

   }

    connection.isAlive=true;

   connection.timer= setInterval(() => {
        connection.ping();
        connection.deathTimer =setInterval(() => {
            connection.isAlive=false;
            clearInterval(connection.timer);
            connection.terminate;
            notifyAboutOnlinePeople();
        }, 1000);
    }, 5000);

    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer);
    })
   const cookies=req.headers.cookie;
   if(cookies){
   const tokenCookieString= cookies.split(';').find(str=>str.startsWith('token='))
   if(tokenCookieString){
    const token=tokenCookieString.split('=')[1];
    if(token){
        jwt.verify(token,jwtsecret,{},(err,userData)=>{
            if(err) throw err;
            const{userId,username}=userData;
            connection.userId=userId;
            connection.username=username;
             
        })
    }
   }
   }

   connection.on('message',async(message)=>{
   const messageData=JSON.parse(message.toString());
   const {recipient,text,file}=messageData;
   let filename=null;
   let filedata=null;
   if(file){
    const parts=file.info.split('.');
    const ext=parts[parts.length-1];
    filename=Date.now()+'.'+ext;
    const bufferData= Buffer.from(file.data.split(',')[1],'base64');
    const url=  await uploadToS3(filename,bufferData,file.mimeType);
   filedata={name:filename,Url:url};

   }
   if(recipient && (text||file)){
   const messageDoc= await Message.create({
        sender:connection.userId,
        recipient,
        text,
        filename:file?filedata.name:null,
        fileurl:file?filedata.Url:null

    });
    [...wss.clients].filter(c=>c.userId===recipient)
    .forEach(c=> c.send(JSON.stringify(
        {text,sender:connection.userId,recipient,_id:messageDoc._id,file:file?{filename,fileurl}:null}))); 
     
   }


   });
    //notify about online people when someone connects
    notifyAboutOnlinePeople();

})






// connection.on('message',async(message)=>{
//     const messageData=JSON.parse(message.toString());
//     const {recipient,text,file}=messageData;
//     console.log(file);
//     let filename=null;
//     if(file){
//      const parts=file.info.split('.');
//      const ext=parts[parts.length-1];
//      filename=Date.now()+'.'+ext;
//      const path=__dirname+'/Models/uploads/'+filename;
//      const bufferData= Buffer.from(file.data.split(',')[1],'base64');
//      console.log(bufferData);
//      fs.writeFile(path,bufferData,()=>{
//          console.log('file saved');
//      });
//     }
//     if(recipient && (text||file)){
//     const messageDoc= await Message.create({
//          sender:connection.userId,
//          recipient,
//          text,
//          file:file?filename:null,
//      });
//      [...wss.clients].filter(c=>c.userId===recipient)
//      .forEach(c=> c.send(JSON.stringify(
//          {text,sender:connection.userId,recipient,_id:messageDoc._id,file:file?filename:null}))); 
 
//     }
 
 
//     });
