var express = require("express");
var router = express.Router();
const User = require("../models/User");
const multer = require("multer");
const Comment = require("../models/Comments");
const Post = require("../models/Post");
const validator = require("validator");
const upload = multer({ dest: "public/images/uploads/" });
const profile = multer({ dest: "public/images/profiles/" });

//Auth
const auth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET users listing. */
router.get("/", auth, function (req, res, next) {
  Post.find({ author: req.session.user.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) throw err;
      Post.countDocuments({ author: req.session.user.id }, (err2, rtn2) => {
        if (err2) throw err2;
        Post.countDocuments(
          { "like.user": { $in: req.session.user.id } },
          (err3, rtn3) => {
            if (err3) throw err3;
            User.findById(req.session.user.id)
              .select("favoriteB")
              .exec((err4, rtn4) => {
                if (err4) throw err4;
                Comment.countDocuments(
                  { commenter: req.session.user.id },
                  (err5, rtn5) => {
                    if (err5) throw err5;
                    res.render("user/index", {
                      posts: rtn,
                      postCount: rtn2,
                      likeCount: rtn3,
                      favCount: rtn4,
                      commentCount: rtn5,
                    });
                  }
                );
              });
          }
        );
      });
    });
});

//Post Add
router.get("/postadd", (req, res) => {
  res.render("user/postadd");
});

//Post Uploading
router.post("/postadd", auth, upload.single("image"), (req, res) => {
  let title = validator.isAlpha(req.body.title);
  let content = validator.isAlphanumeric(req.body.content);
  if (title == true) {
  } else {
    res.send(
      '<script>alert("Your title should be a-z or A-Z"); window.location.href = "/users/postadd"; </script>'
    );
  }
  if (content == true) {
  } else {
    res.send(
      '<script>alert("Your content should be a-z or A-Z/0-9"); window.location.href = "/users/postadd"; </script>'
    );
  }
  if (title == true && content == true) {
    let post = new Post();
    post.title = req.body.title;
    post.content = req.body.content;
    post.author = req.session.user.id;
    post.created = Date.now();
    post.updated = Date.now();
    if (req.file) post.image = "/images/uploads/" + req.file.filename;
    post.save((err, rtn) => {
      if (err) throw err;
      console.log(rtn);
      res.redirect("/users");
    });
  }
});

//Post Delete
router.get("/postdelete/:id", auth, (req, res) => {
  Post.findOneAndDelete(
    { _id: req.params.id, author: req.session.user.id },
    (err, rtn) => {
      if (err) throw err;
      if (rtn != null) {
        Comment.findOneAndDelete(
          { post: req.params.id, author: req.session.user.id },
          (err2, rtn2) => {
            if (err2) throw err2;
            res.redirect("/users");
          }
        );
      } else {
        res.redirect("../../forbidden");
      }
    }
  );
});

//Profile Setting
router.get("/profile-setting", auth, (req, res) => {
  User.findOne({ _id: req.session.user.id }, (err, rtn) => {
    if (err) throw err;
    res.render("user/profile", { acc: rtn });
  });
});

//Profile Update
router.post("/profile", auth, profile.single("image"), (req, res) => {
  let name = validator.isAlpha(req.body.name);
  let email = validator.isEmail(req.body.email);
  let about = validator.isAlphanumeric(req.body.about);
  if (name == true) {
  } else {
    res.send(
      '<script>alert("Your name should be a-z or A-Z"); window.location.href = "/users/profile"; </script>'
    );
  }
  if (email == true) {
  } else {
    res.send(
      '<script>alert("Your email is not correct format"); window.location.href = "/users/profile"; </script>'
    );
  }
  if (about == true) {
  } else {
    res.send(
      '<script>alert("Your about should be a-zA-Z0-9"); window.location.href = "/users/profile"; </script>'
    );
  }
  if (name == true && email == true && about == true) {
    let profile = {
      name: req.body.name,
      email: req.body.email,
      about: req.body.about,
    };
    if (req.file) profile.image = "/images/profiles/" + req.file.filename;
    User.findOneAndUpdate(
      { _id: req.session.user.id },
      { $set: profile },
      (err, rtn) => {
        if (err) throw err;
        req.session.user = {
          name: req.body.name,
          email: req.body.email,
          id: req.session.user.id,
        };
        if (req.file) {
          req.session.user.image = "/images/profiles/" + req.file.filename;
        } else {
          req.session.user.image = req.body.profile_image;
        }
        res.redirect("/users/profile-setting");
      }
    ); 
  }
});

//Post Update Page
router.get("/postupdate/:id", auth, (req, res) => {
  Post.findOne(
    { _id: req.params.id, author: req.session.user.id },
    (err, rtn) => {
      if (err) throw err;
      res.render("user/postupdate", { post: rtn });
    }
  );
});

//Post Update
router.post("/postupdate", auth, upload.single("image"), (req, res) => {
  let title1 = validator.isAlpha(req.body.title);
  let content1 = validator.isAlphanumeric(req.body.content);
  if(title1 == true) {
  } else {
    res.send(
      '<script>alert("Your title should be a-zA-Z"); window.location.href = "/users/postupdate"; </script>'
    );
  }
  if(content1 == true) {
  } else {
    res.send(
      '<script>alert("Your about should be a-zA-Z0-9"); window.location.href = "/users/postupdate"; </script>'
    );
  }
  if(title1 == true && content1 == true) {
    let update = {
      title: req.body.title,
      content: req.body.content,
      updated: Date.now(),
    };
    if (req.file) update.image = "/images/uploads/" + req.file.filename;
    Post.findOneAndUpdate(
      { _id: req.body.id, author: req.session.user.id },
      { $set: update },
      (err, rtn) => {
        if (err) throw err;
        res.redirect("/users");
      }
    );
  }
});

//Post Detail Page
router.get("/postdetail/:id", auth, (req, res) => {
  Post.findOne({ _id: req.params.id, author: req.session.user.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) throw err;
      Comment.find({ post: req.params.id })
        .populate("commenter")
        .populate("author")
        .select("comment reply author updated")
        .exec((err2, rtn2) => {
          if (err2) throw err2;
          Comment.countDocuments({ post: req.params.id }, (err3, count) => {
            if (err3) throw err3;
            let reactStatus;
            if (req.session.user) {
              reactStatus = rtn.like.filter(function (data) {
                return data.user == req.session.user.id;
              });
              res.render("user/postdetail", {
                post: rtn,
                comments: rtn2,
                cmtcount: count,
                reactStatus: reactStatus,
              });
            } else {
              reactStatus = [];
              res.render("user/postdetail", {
                post: rtn,
                comments: rtn2,
                cmtcount: count,
                reactStatus: reactStatus,
              });
            }
          });
        });
    });
});

//Give Comment
router.post("/givecomment", (req, res) => {
  let comment = new Comment();
  comment.author = req.body.author;
  comment.post = req.body.post;
  comment.comment = req.body.comment;
  comment.commenter = req.session.user.id;
  comment.created = Date.now();
  comment.updated = Date.now();
  comment.save((err, rtn) => {
    console.log(rtn);
    if (err) {
      res.json({
        status: "error",
      });
    } else {
      res.json({
        status: true,
      });
    }
  });
});

//Reply
router.post("/givereply", (req, res) => {
  const update = {
    reply: req.body.reply,
    updated: Date.now(),
  };
  Comment.findByIdAndUpdate(req.body.comment, { $set: update }, (err, rtn) => {
    if (err) {
      res.json({
        status: "error",
      });
    } else {
      res.json({
        status: true,
      });
    }
  });
});

//Give Like
router.post("/givelike", auth, (req, res) => {
  if (req.body.action === "like") {
    Post.findByIdAndUpdate(
      req.body.pid,
      { $push: { like: { user: req.session.user.id } } },
      (err, rtn) => {
        if (err) {
          res.json({
            status: "error",
          });
        } else {
          console.log(rtn);
          res.json({
            status: true,
          });
        }
      }
    );
  } else {
    Post.findById(req.body.pid, (err, rtn) => {
      if (err) {
        res.json({
          status: "error",
        });
      } else {
        const likelist = rtn.like.filter(function (data) {
          return data.user != req.session.user.id;
        });
        Post.findByIdAndUpdate(
          req.body.pid,
          { $set: { like: likelist } },
          (err2, rtn2) => {
            if (err2) {
              res.json({
                status: "error",
              });
            } else {
              res.json({
                status: true,
              });
            }
          }
        );
      }
    });
  }
});

//give Favorite
router.post("/givefav", auth, (req, res) => {
  if (req.body.action == "fav") {
    User.findByIdAndUpdate(
      req.session.user.id,
      { $push: { favoriteB: { blogger: req.body.aid } } },
      (err, rtn) => {
        if (err) {
          res.json({
            status: "error",
          });
        } else {
          console.log(rtn);
          res.json({
            status: true,
          });
        }
      }
    );
  } else {
    User.findById(req.session.user.id, (err, rtn) => {
      if (err) {
        res.json({
          status: "error",
        });
      } else {
        let bloggerlist = rtn.favoriteB.filter(function (data) {
          return data.blogger != req.body.aid;
        });
        User.findByIdAndUpdate(
          req.session.user.id,
          { $set: { favoriteB: bloggerlist } },
          (err2, rtn2) => {
            if (err2) {
              res.json({
                status: "error",
              });
            } else {
              res.json({
                status: true,
              });
            }
          }
        );
      }
    });
  }
});

//fav bloglist
router.get("/favblogs", auth, (req, res) => {
  User.findById(req.session.user.id, (err, rtn) => {
    if (err) throw err;
    let favlist = [];
    rtn.favoriteB.forEach((element) => {
      favlist.push(element.blogger);
    });
    Post.find({ author: { $in: favlist } }, (err2, rtn2) => {
      if (err2) throw err2;
      res.render("user/favblog", { posts: rtn2 });
    });
  });
});

module.exports = router;
