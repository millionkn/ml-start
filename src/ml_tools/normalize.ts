import * as tf from '@tensorflow/tfjs';

function shape(data: any): number[] {
  if (data instanceof Array) {
    return [data.length, ...shape(data[0])]
  } else {
    return [];
  }
}

export function normalize<T, K extends any[]>(data: T[], distFun: (obj: T) => K) {
  return tf.tidy(() => {
    const dist = data.map(distFun);
    const inputTensor = tf.tensor(dist);
    const max = inputTensor.max();
    const min = inputTensor.min();
    const normalized = inputTensor.sub(min).div(max.sub(min));

    return {
      shape: shape(dist),
      normalized,
      max,
      min,
    }
  });
}