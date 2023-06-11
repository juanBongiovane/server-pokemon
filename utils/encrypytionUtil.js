const bcrypt = require('bcrypt')

let encryptionUtil = {
    encryptPassword: function(password, salt) {
        let encryptedPassword;
        if (salt == null) {
            salt = bcrypt.genSaltSync();
        }
        encryptedPassword = bcrypt.hashSync(password, salt);
        return {
            salt: salt,
            encryptedPassword: encryptedPassword
        };
    },
    comparePassword: function(password, salt, encryptedPasswordToCompareTo) {
        let encryptedPassword;
        encryptedPassword = this.encryptPassword(password, salt).encryptedPassword;
        return encryptedPassword === encryptedPasswordToCompareTo;
    }
};

module.exports = encryptionUtil