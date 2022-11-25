export type KeySerializationMethod<LI> = (args: { forInput: LI }) => string;

export const noOp = <LO, CV>(value: LO): CV => value as any;
export const defaultKeySerializationMethod: KeySerializationMethod<any> = ({ forInput }) => JSON.stringify(forInput);
export const defaultValueSerializationMethod = noOp;
export const defaultValueDeserializationMethod = noOp;
