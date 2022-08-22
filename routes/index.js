var express = require("express");
var multer = require("multer");
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comments");
const validator = require("validator");
const bcryptjs = require("bcryptjs");
var router = express.Router();

const auth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", function (req, res, next) {
  Post.aggregate([
    {
      $project: {
        title: 1,
        image: 1,
        content: 1,
        updated: 1,
        created: 1,
        author: 1,
        like: 1,
        length: { $size: "$like" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
      },
    },
    { $sort: { length: -1 } },
    { $limit: 12 },
  ]).exec((err, rtn) => {
    if (err) throw err;
    Comment.aggregate([
      {
        $group: {
          _id: "$post",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "post",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "post.author",
          foreignField: "_id",
          as: "author",
        },
      },
    ]).exec((err2, rtn2) => {
      if (err2) throw err2;
      console.log(rtn2);
      res.render("index", { mostlike: rtn, mostcomment: rtn2 });
    });
  });
});

//Login And Register
router.get("/login", (req, res) => {
  res.render("login");
});

//Login
router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err, rtn) => {
    if (err) throw err;
    if (rtn != null && User.compare(req.body.password, rtn.password)) {
      req.session.user = {
        name: rtn.name,
        id: rtn._id,
        email: rtn.email,
        image: rtn.image,
      };
      res.redirect("/");
    } else {
      res.redirect("/login");
    }
  });
});

//Register
router.post("/register", (req, res) => {
  let email = validator.isEmail(req.body.email);
  let password = validator.isStrongPassword(req.body.password);
  if (email == true) {
  } else {
    res.send(
      '<script>alert("Please enter correct email"); window.location.href = "/login"; </script>'
    );
  }
  if (password == true) {
  } else {
    res.send(
      '<script>alert("Your password should be Uppercase,Lowercase,Special Characters,Number and a-z or A-Z"); window.location.href = "/login"; </script>'
    );
  }
  if (email == true && password == true) {
    let user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.password = req.body.password;
    user.save((err, rtn) => {
      if (err) throw err;
      res.redirect("/login");
    });
  }
});

//all posts
router.get("/allposts", (req, res) => {
  Post.find({})
    .populate("author")
    .exec((err, rtn) => {
      if (err) throw err;
      res.render("allposts", { posts: rtn });
    });
});

//Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/");
  });
});

//Post Detail
router.get("/postdetail/:id", (req, res) => {
  Post.findById(req.params.id)
    .populate("author")
    .exec((err, rtn) => {
      if (err) throw err;
      Comment.find({ post: req.params.id })
        .populate("commenter")
        .populate("author")
        .select("created updated author comment reply commenter")
        .exec((err2, rtn2) => {
          if (err2) throw err2;
          Comment.countDocuments({ post: req.params.id }, (err4, count) => {
            if (err4) throw err4;
            let reactStatus;
            let favStatus;
            if (req.session.user) {
              reactStatus = rtn.like.filter(function (data) {
                return data.user == req.session.user.id;
              });
              User.findById(req.session.user.id, (err4, rtn4) => {
                if (err4) throw err4;
                favStatus = rtn4.favoriteB.filter(function (data) {
                  return data.blogger == rtn.author._id.toString();
                });
                console.log(favStatus);
                res.render("postdetail", {
                  post: rtn,
                  comments: rtn2,
                  reactStatus: reactStatus,
                  cmtcount: count,
                  favStatus: favStatus,
                });
              });
            } else {
              reactStatus = [];
              favStatus = [];
              res.render("postdetail", {
                post: rtn,
                comments: rtn2,
                reactStatus: reactStatus,
                cmtcount: count,
                favStatus: favStatus,
              });
            }
          });
        });
    });
});

//Change Password
router.get("/changepassword", auth, (req, res) => {
  User.findOne({ _id: req.session.user.id }, (err, rtn) => {
    if (rtn != null) {
      res.render("changepassword", { acc: rtn });
    } else {
      res.redirect("/forbidden");
    }
  });
});

//Chg pwd
router.post("/changepassword", auth, (req, res) => {
  User.findOne({ _id: req.session.user.id }, (err, rtn) => {
    console.log(rtn);
    console.log(req.body.cpwd);
    if (err) throw err;
    if (rtn != null && User.compare(req.body.cpwd, rtn.password)) {
      let rpwd = validator.isStrongPassword(req.body.rpwd);
      if (req.body.npwd == req.body.rpwd) {
        if (rpwd == true) {
          const pwd = bcryptjs.hashSync(
            req.body.rpwd,
            bcryptjs.genSaltSync(8),
            null
          );
          User.findOneAndUpdate(
            { _id: req.session.user.id },
            { $set: { password: pwd } },
            (err, rtn) => {
              if (err) throw err;
              res.redirect(
                "/changepassword?error=" + encodeURIComponent("Successfull")
              );
            }
          );
        } else {
          res.redirect(
            "/changepassword?error=" + encodeURIComponent("Not_Match_Password")
          );
        }
      } else {
        res.redirect(
          "/changepassword?error=" + encodeURIComponent("Wrong_Password")
        );
      }
    } else {
      res.send(
        '<script>alert("Your password should be Uppercase,Lowercase,Special Characters,Number and a-z or A-Z"); window.location.href = "/changepassword"; </script>'
      );
    }
  });
});

//Search
router.get("/search", (req, res) => {
  var titlee = req.query.title;
  if (req.url == "/search/" || req.url == "/search") {
    res.redirect("../forbidden");
  } else {
    Post.find({
      $or: [
        { title: { $regex: titlee, $options: "i" } },
        { content: { $regex: titlee, $options: "i" } },
      ],
    })
      .populate("author")
      .exec((err, rtn) => {
        if (err) throw err;
        res.render("search", { search: rtn });
      });
  }
});

//account
router.get("/account/:id", (req, res) => {
  User.findById(req.params.id, (err, rtn) => {
    if (err) throw err;
    res.render("account", { acc: rtn });
  });
});

//cmt delete
router.get("/cmtdelete/:id/:pid", auth, (req, res) => {
  Comment.findOneAndDelete(
    { _id: req.params.id, commenter: req.session.user.id },
    (err, rtn) => {
      if (err) throw err;
      if (rtn != null) {
        res.redirect("/postdetail/" + req.params.pid);
      } else {
        res.redirect("../../forbidden");
      }
    }
  );
});

//forbidden
router.get("/forbidden", (req, res) => {
  res.render("forbidden");
});

//duemail check
router.post("/duemailcheck", function (req, res) {
  User.findOne({ email: req.body.email }, function (err, rtn) {
    if (err) throw err;
    res.json({
      status: rtn != null ? true : false,
    });
  });
});

module.exports = router;
