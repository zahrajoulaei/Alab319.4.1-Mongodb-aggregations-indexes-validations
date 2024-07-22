import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});




router.get('/stats', async (req, res) => {
  try {
    let collection = await db.collection('grades');

    let result = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalLearners: { $sum: 1 },
          learnersAbove70: {
            $sum: {
              $cond: [{ $gt: ["$average", 70] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalLearners: 1,
          learnersAbove70: 1,
          percentageAbove70: {
            $multiply: [
              { $divide: ["$learnersAbove70", "$totalLearners"] },
              100
            ]
          }
        }
      }
    ]).toArray();

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/stats/:id', async (req, res) => {
  try {
    let collection = await db.collection('grades');

    let result = await collection.aggregate([
      { $match: { class_id: Number(req.params.id) } },
      {
        $group: {
          _id: null,
          totalLearners: { $sum: 1 },
          learnersAbove70: {
            $sum: {
              $cond: [{ $gt: ["$average", 70] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalLearners: 1,
          learnersAbove70: 1,
          percentageAbove70: {
            $multiply: [
              { $divide: ["$learnersAbove70", "$totalLearners"] },
              100
            ]
          }
        }
      }
    ]).toArray();

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
