const ErrorHandler = require("../utils/errorhandler")
const catchAsyncErrors = require('../middleware/catchAsyncErrors')
const User = require("../models/userModels")
const sendToken = require("../utils/jwtToken")
const sendEmail = require("../utils/sendEmail")
const crypto = require("crypto")

//Register a new user
exports.registerUser = catchAsyncErrors( async(req,res,next)  => {

  const {name,email,password} = req.body
  const user = await User.create({
    name,email,password,
    avatar:{
        public_id:"this is a sample id",
        url:"profilepicUrl"
    }
  })

   sendToken(user,201,res)
})

//login user
 exports.loginUser = catchAsyncErrors( async(req,res,next) => {


    const {email,password} = req.body

    //checking to give email and password
    if(!email || !password){
        return next(new ErrorHandler("Please enter email and password",400))
    }

    const user = await User.findOne({email}).select("+password")

    if(!user){
        return next(new ErrorHandler("Invalid email or password",401))
    }

    const isPasswordMatched = user.comparePassword(password)

    if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid email or password",401))
    }
   
    sendToken(user,200,res)

 })


 //logout user

 exports.logout = catchAsyncErrors(async(req,res,next)=>{
  res.cookie("token",null,{
    expires:new Date(Date.now()),
    httpOnly:true
  })

    res.status(200).json({
        success:true,
        message:"Logged out successfully"
    })
 })


 //forgot password

// Forgot Password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

     // Get ResetPassword Token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/password/reset/${resetToken}`;

  const message = `Your password reset token is :- \n\n ${resetPasswordUrl} \n\nIf you have not requested this email then, please ignore it.`;

  try {
    await sendEmail({
      email: user.email,
      subject: `Ecommerce Password Recovery`,
      message,
    });

    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler(error.message, 500));
  }
})


//Reset Password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  
  //creating token hash
  const resetPasswordToken = crypto
  .createHash("sha256")
  .update(req.params.token)
  .digest("hex");


const user = await User.findOne({
   resetPasswordToken,
   resetPasswordExpire : { $gt: Date.now() }
   
})

if (!user) {
  return next(new ErrorHandler("Reset Token is invalid or has been expired", 400));
}

  if(req.body.password !== req.body.confirmPassword){
    return next(new ErrorHandler("Password does not matches", 400));
  }
  
  user.password = req.body.password
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save()

  sendToken(user,200,res)
})


//get user details
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

// update User password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

  if (!isPasswordMatched) {
    return next(new ErrorHander("Old password is incorrect", 400));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHander("password does not match", 400));
  }

  user.password = req.body.newPassword;

  await user.save();

  sendToken(user, 200, res);
});

// update User Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
  };

  //add cloudinary later  

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});


//Get all users --admin
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
   
   const users = await User.find()

   res.status(200).json({
    success:true,
     users
   })
   
})

//Get single user --admin
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
   
  const user = await User.findById(req.params.id)

  if(!user){
    return next(new ErrorHandler(`User doesn't exists with id ${req.params.id}`))
  }

  res.status(200).json({
   success:true,
    user
  })
  
})



// update User Role --admin
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role
  };

  

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});



// Delete User --admin
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
 
   const user = await User.findById(req.params.id) 


   if(!user){
    return next(new ErrorHandler(`User doesn't exists with id ${req.params.id}`))
   }

   await user.deleteOne()
  //remove cloudinary later  

  res.status(200).json({
    success: true,
    message:"User deleted successfully"
  });
});


