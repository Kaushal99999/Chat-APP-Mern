const mongoose=require('mongoose');

const UserSchema=new mongoose.Schema({
    username:{type:String,unique:true},
    password:String,
},{timestamps:true});

module.exports= UserModel=mongoose.model('User',UserSchema);