import { z } from 'zod'

const schema = z.preprocess((val) => val, z.number())
type T1 = typeof schema
type T2 = z.infer<T1>
type T3 = z.input<T1>
