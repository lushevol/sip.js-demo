/*
 * @Description: 
 * @Author: lushevol
 * @Date: 2019-08-27 17:53:42
 * @LastEditors: lushevol
 * @LastEditTime: 2019-08-31 20:34:01
 */
import SIP from 'sip.js'

interface IWS {
  protocol: string,
  server: string,
  port: number
}
interface ISipAccount {
  name?: string,
  no: string,
  pwd: string
}

interface ISessionParams {
  audio: boolean,
  video: boolean
}

interface ICallbackObj {
  [propName: string]: any
}

interface IErrorMsg {
  message: string,
  messageType: string,
  reason: string,
  code: string
}

interface IMediaDom {
  remoteAudio?: HTMLAudioElement,
  remoteVideo?: HTMLVideoElement,
  localVideo?: HTMLVideoElement
}

interface IModifiers {
  ptime: string
}

type OutgoingSession = SIP.ClientContext;
type IncomingSession = SIP.ServerContext;

export { IWS, ISipAccount, ISessionParams, ICallbackObj, IErrorMsg, OutgoingSession, IncomingSession, IMediaDom }
