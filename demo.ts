/*
 * @Description: demo
 * @Author: lushevol
 * @Date: 2019-09-06 17:11:30
 * @LastEditors: lushevol
 * @LastEditTime: 2019-09-14 22:11:07
 */
import { sipphone } from "./sipphone";
import { ISipAddress, ISipAccount, IMediaDom } from "./sipphone.declar";

const servers:ISipAddress[] = [{
  protocol: 'wss',
  server: '',
  port: 443
}]

const account:ISipAccount = {
  name: 'TEST USER',
  no: '1234',
  pwd: '1234'
}

const MD:IMediaDom = {
  remoteAudio: document.querySelector('#removeAudio'),
  remoteVideo: document.querySelector('#removeVideo'),
  localVideo: document.querySelector('#localVideo')
}

const SIPPHONE = new sipphone(account, servers)

const UA = SIPPHONE.init(MD)

SIPPHONE.on('callIn', (session) => {
  // triggerd when someone is calling you
})
SIPPHONE.on('callOut', () => {
  // triggerd when you call out
})
SIPPHONE.on('callOutBack', () => {
  // triggerd when you call out and internal callback
})
// call someone whos number is 1235
SIPPHONE.on('accepted', ({ response, cause }) => {
  // triggerd when your call is accepted by peer
})
SIPPHONE.on('hungup', ({ response, cause }) => {
  // triggerd when call is finished
})
SIPPHONE.on('error', (error) => {
  // triggerd when error is occur while calling
})

// call someone whos number is 12345
UA.invite(12345)