export type KeySerializationMethod<LI> = (args: { forInput: LI }) => string;

export const noOp = <LO, CV>(value: LO): CV => value as any;
export const defaultKeySerializationMethod: KeySerializationMethod<any> = ({
  forInput,
}) => JSON.stringify(forInput);
export const defaultValueSerializationMethod = noOp;
export const defaultValueDeserializationMethod = noOp;
export const defaultShouldBypassGetMethod = () => {
  if (process.env.CACHE_BYPASS_GET)
    return process.env.CACHE_BYPASS_GET === 'true';
  if (process.env.CACHE_BYPASS) return process.env.CACHE_BYPASS === 'true';
  return false;
};
export const defaultShouldBypassSetMethod = () => {
  if (process.env.CACHE_BYPASS_SET)
    return process.env.CACHE_BYPASS_SET === 'true';
  if (process.env.CACHE_BYPASS) return process.env.CACHE_BYPASS === 'true';
  return false;
};
