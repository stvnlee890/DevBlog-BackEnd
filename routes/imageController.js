require("dotenv").config();
const multer = require("multer");
const router = require("express").Router();
const imageModel = require("../model/imageModel");
const Post = require("../model/Post");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// RANDOMIZE UNIQUE KEYS TO UPLOAD TO AWS
const randomName = (bytes = 16) => crypto.randomBytes(bytes).toString("hex");

// AWS VARIABLES FOR AWS CREDENTIALS
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

// PARAMS TO SEND TO AWS
const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  region: region,
});

// MULTER MEMORY STORAGE
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/:imageKey", async (req, res) => {
  try {
    const image = await imageModel.find({ imageKey: req.params.imageKey });

    for (const img of image) {
      const getObjectParams = {
        Bucket: bucketName,
        Key: req.params.imageKey,
      };
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      img.imageUrl = url;
    }
    res.status(200).json(image);
  } catch (error) {
    console.log(error);
  }
});

router.get("/post/:imageId", async (req, res) => {
  // find image by store Reference
  try {
    const image = await imageModel.findById(req.params.imageId);
    res.status(200).json(image);
  } catch (error) {
    console.log(error);
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  console.log(req.file);
  console.log(req.body);
  try {
    const randomImageKey = randomName();
    const params = {
      Bucket: bucketName,
      Key: randomImageKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };
    const command = new PutObjectCommand(params);
    await s3.send(command);
    const postImage = await imageModel.create({
      ...req.body,
      imageKey: randomImageKey,
    });
    return res.status(201).json({ body: postImage, status: true });
  } catch (error) {
    console.log(error);
  }
});

// DELETE IMAGE
router.delete("/:postId/:imageKey/:imageId", async (req, res) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: req.params.imageKey,
    };
    const command = new DeleteObjectCommand(params);
    await s3.send(command);
    await imageModel.findOneAndDelete({ imageKey: req.params.imageKey });
    const post = await Post.findOneAndUpdate(
      { _id: req.params.postId },
      { $unset: { imageId: "" } }
    );
    res.status(204).json(post);
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
