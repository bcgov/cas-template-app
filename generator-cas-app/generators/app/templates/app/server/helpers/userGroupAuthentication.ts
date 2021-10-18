import groupConstants from "../../data/group-constants";
import { compactGroups } from "../../lib/userGroups";

const removeFirstLetter = (str) => str.slice(1);

export const getUserGroups = (req) => {
  if (
    !req.kauth ||
    !req.kauth.grant ||
    !req.kauth.grant.id_token ||
    !req.kauth.grant.id_token.content ||
    !req.kauth.grant.id_token.content.groups
  )
    return [groupConstants.GUEST];

  const brokerSessionId = req.kauth.grant.id_token.content.broker_session_id;
  const { groups } = req.kauth.grant.id_token.content;

  const processedGroups = groups.map((value) => removeFirstLetter(value));
  const validGroups = compactGroups(processedGroups);

  if (validGroups.length === 0) {
    return brokerSessionId &&
      brokerSessionId.length === 41 &&
      brokerSessionId.startsWith("idir.")
      ? [groupConstants.PENDING_ANALYST]
      : [groupConstants.USER];
  }

  return validGroups;
};