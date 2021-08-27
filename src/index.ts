import * as tf from '@tensorflow/tfjs';
import carsData from '../data/car.json';
import { normalize } from './ml_tools/normalize';

const cleaned = carsData
  .filter((car) => car.Horsepower !== null && car.Miles_per_Gallon !== null)
  .map(car => ({
    Miles_per_Gallon: car.Miles_per_Gallon!,
    Horsepower: car.Horsepower!,
    Cylinders: car.Cylinders,
    Displacement: car.Displacement,
    Weight_in_lbs: car.Weight_in_lbs,
    Acceleration: car.Acceleration,
  }))

const xxx = tf.tidy(() => {
  tf.util.shuffle(cleaned);
  const input = normalize(cleaned, d => [
    d.Horsepower,
    d.Weight_in_lbs,
    d.Displacement,
    d.Cylinders,
    d.Acceleration,
  ])
  const output = normalize(cleaned, d => [d.Miles_per_Gallon]);
  return {
    input,
    output,
  }
})


export const model = tf.sequential();
// Add a single input layer
model.add(tf.layers.dense({ inputShape: xxx.input.shape.slice(1), units: 10 }));
// Add an output layer
model.add(tf.layers.dense({ units: 1, useBias: true }));
model.compile({
  optimizer: tf.train.adam(),
  loss: tf.losses.meanSquaredError,
  metrics: ['mse'],
});

async function trainModel() {
  return await model.fit(xxx.input.normalized, xxx.output.normalized, {
    batchSize: 32,
    epochs: Math.floor(cleaned.length),
    shuffle: false,
    callbacks: { onEpochEnd: (epoch, log) => console.log(`Epoch ${epoch}: loss = ${log?.loss}`) }
  });
}

trainModel()