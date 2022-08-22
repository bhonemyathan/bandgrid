const router = require("express").Router();
const Post = require("../../models/Post");
const User = require("../../models/User");
const Comment = require("../../models/Comments");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const auth = require("../middleware/check-auth");
const multer = require("multer");
const upload = multer({ dest: "public/images/uploads/" });

router.get("/", auth, function (req, res, next) {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  Post.find({ author: decode.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        Post.countDocuments({ author: decode.id }, (err2, rtn2) => {
          if (err2) {
            res.status(500).json({
              message: "Internal Server Error",
              error: err2,
            });
          } else {
            Post.countDocuments(
              { "like.user": { $in: decode.id } },
              (err3, rtn3) => {
                if (err3) {
                  res.status(500).json({
                    message: "Internal Server Error",
                    error: err3,
                  });
                } else {
                  User.findById(decode.id)
                    .select("favoriteB")
                    .exec((err4, rtn4) => {
                      if (err4) {
                        res.status(500).json({
                          message: "Internal Server Error",
                          error: err4,
                        });
                      } else {
                        Comment.countDocuments(
                          { commenter: decode.id },
                          (err5, rtn5) => {
                            if (err5) {
                              res.status(500).json({
                                message: "Internal Server Error",
                                error: err5,
                              });
                            } else {
                              res.status(200).json({
                                posts: rtn,
                                postCount: rtn2,
                                likeCount: rtn3,
                                favCount: rtn4,
                                commentCount: rtn5,
                              });
                            }
                          }
                        );
                      }
                    });
                }
              }
            );
          }
        });
      }
    });
});

//Postadd
router.post("/postadd", auth, upload.single("image"), (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  let post = new Post();
  post.title = req.body.title;
  post.content = req.body.content;
  post.author = decode.id;
  post.created = Date.now();
  post.updated = Date.now();
  if (req.file) post.image = "/images/uploads/" + req.file.filename;
  post.save((err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      console.log(rtn);
      res.status(201).json({
        message: "Post created",
        posts: rtn,
      });
    }
  });
});

//Post list
router.get("/myposts", (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  Post.find({ author: decode.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        res.status(200).json({
          message: "Post list",
          posts: rtn,
        });
      }
    });
});

router.get("/postdetail/:id", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  Post.findOne({ _id: req.params.id, author: decode.id })
    .populate("author")
    .exec((err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal server error",
          error: err,
        });
      } else {
        if (rtn != null) {
          Comment.find({ post: req.params.id })
            .populate("commenter")
            .populate("author")
            .select("comment reply author updated")
            .exec((err2, rtn2) => {
              if (err2) {
                res.status(500).json({
                  message: "Internal server error",
                  error: err2,
                });
              } else {
                Comment.countDocuments(
                  { post: req.params.id },
                  (err3, count) => {
                    if (err3) {
                      res.status(500).json({
                        message: "Internal server error",
                        error: err,
                      });
                    } else {
                      let reactStatus;
                      try {
                        reactStatus = rtn.like.filter(function (data) {
                          return data.user == decode.id;
                        });
                        res.status(200).json({
                          post: rtn,
                          comments: rtn2,
                          cmtcount: count,
                          reactStatus: reactStatus,
                        });
                      } catch {
                        reactStatus = [];
                        res.status(200).json({
                          post: rtn,
                          comments: rtn2,
                          cmtcount: count,
                          reactStatus: reactStatus,
                        });
                      }
                    }
                  }
                );
              }
            });
        } else {
          res.status(401).json({
            message: "You cannot access this page",
          });
        }
      }
    });
});

router.patch("/postupdate", auth, upload.single("image"), (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  let update = {
    title: req.body.title,
    content: req.body.content,
    updated: Date.now(),
  };
  if (req.file) {
    update.image = "/images/uploads/" + req.file.filename;
  }
  Post.findOneAndUpdate(
    { _id: req.body.id, author: decode.id },
    { $set: update },
    (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        fs.unlink("public" + rtn.image, (err) => {
          if (err) {
            res.status(500).json({
              message: "Internal Server Error",
              error: err,
            });
          }
        });
        res.status(200).json({
          message: "Post updated",
          post: rtn,
        });
      }
    }
  );
});

router.delete("/postdelete/:id", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  Post.findOneAndDelete(
    { _id: req.params.id, author: decode.id },
    (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        if (rtn != null) {
          Comment.findOneAndDelete(
            { post: req.params.id, author: decode.id },
            (err2, rtn2) => {
              if (err2) {
                res.status(500).json({
                  message: "Internal Server Error",
                  error: err2,
                });
              } else {
                fs.unlink("public" + rtn.image, (err) => {
                  if (err) {
                    res.status(500).json({
                      message: "Internal Server Error",
                      error: err,
                    });
                  } else {
                res.status(200).json({
                  message: "Post delete success",
                });
                  }
              }
                )};
            }
          );
        } else {
          res.status(403).json({
            message: "You can't access this page",
          });
        }
      }
    }
  );
});

router.post("/givecomment", (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  let comment = new Comment();
  comment.author = req.body.author;
  comment.post = req.body.post;
  comment.comment = req.body.comment;
  comment.commenter = decode.id;
  comment.created = Date.now();
  comment.updated = Date.now();
  comment.save((err, rtn) => {
    console.log(rtn);
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      res.status(201).json({
        message: "Comment created",
      });
    }
  });
});

router.patch("/givereply", (req, res) => {
  const update = {
    reply: req.body.reply,
    updated: Date.now(),
  };
  Comment.findByIdAndUpdate(req.body.comment, { $set: update }, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      res.status(200).json({
        message: "Reply success",
      });
    }
  });
});

router.post("/givelike", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  if (req.body.action === "like") {
    Post.findByIdAndUpdate(
      req.body.pid,
      { $push: { like: { user: decode.id } } },
      (err, rtn) => {
        if (err) {
          res.status(500).json({
            message: "Internal Server Error",
            error: err,
          });
        } else {
          res.status(200).json({
            message: "Like action done",
          });
        }
      }
    );
  } else {
    Post.findById(req.body.pid, (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        const likelist = rtn.like.filter(function (data) {
          return data.user != decode.id;
        });
        Post.findByIdAndUpdate(
          req.body.pid,
          { $set: { like: likelist } },
          (err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                message: "Internal Server Error",
                error: err2,
              });
            } else {
              res.status(200).json({
                message: "Unlike action done",
              });
            }
          }
        );
      }
    });
  }
});

router.post("/givefav", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  if (req.body.action == "fav") {
    User.findByIdAndUpdate(
      decode.id,
      { $push: { favoriteB: { blogger: req.body.aid } } },
      (err, rtn) => {
        if (err) {
          res.status(500).json({
            message: "Internal Server Error",
            error: err,
          });
        } else {
          res.status(200).json({
            message: "Fav action done",
          });
        }
      }
    );
  } else {
    User.findById(decode.id, (err, rtn) => {
      if (err) {
        res.status(500).json({
          message: "Internal Server Error",
          error: err,
        });
      } else {
        let bloggerlist = rtn.favoriteB.filter(function (data) {
          return data.blogger != req.body.aid;
        });
        User.findByIdAndUpdate(
          decode.id,
          { $set: { favoriteB: bloggerlist } },
          (err2, rtn2) => {
            if (err2) {
              res.status(500).json({
                message: "Internal Server Error",
                error: err2,
              });
            } else {
              res.status(200).json({
                message: "Unfav action done",
              });
            }
          }
        );
      }
    });
  }
});

router.get("/favblogs", auth, (req, res) => {
  const decode = jwt.verify(req.headers.token, "BandGridAPI");
  User.findById(decode.id, (err, rtn) => {
    if (err) {
      res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    } else {
      let favlist = [];
      rtn.favoriteB.forEach((element) => {
        favlist.push(element.blogger);
      });
      Post.find({ author: { $in: favlist } }, (err2, rtn2) => {
        if (err2) {
          res.status(500).json({
            message: "Internal Server Error",
            error: err2,
          });
        } else {
          res.status(200).json({
            message: "Fav list",
            posts: rtn2,
          });
        }
      });
    }
  });
});

module.exports = router;
