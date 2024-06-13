const multer = require('multer');
const path = require('path');

module.exports = {
    image: multer({
        fileFilter: (req, file, cb) => {
            let allowedMimeTypes = [
                'image/jpeg', 
                'image/png', 
                'image/jpg'
            ];
            
            if(allowedMimeTypes.includes(file.mimetype)){
                cb(null, true);
            } else {
                let err = new Error('File type not allowed. Only JPEG, PNG, and JPG');
                cb(err, false);
            }
        },
        onError: (err, next) => {
            console.log(err);
            next(err);
        }
    }),
}