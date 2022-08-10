const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  image: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  favoriteB: [
    {
      blogger: {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
    },
  ],
  password: {
    type: String,
    required: true,
  },
  about: {
    type: String,
  },
});

UserSchema.pre("save", function (next) {
  this.password = bcryptjs.hashSync(
    this.password,
    bcryptjs.genSaltSync(8),
    null
  );
  next();
});

UserSchema.statics.compare = function (cleartext, encrypted) {
  return bcryptjs.compareSync(cleartext, encrypted);
};

module.exports = mongoose.model("Users", UserSchema);
