<?php

namespace App\Http\Controllers;

use App\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    protected $appId = '';
    protected $appKey = '';
    protected $http = null;

    public function __construct()
    {
        $this->appId = env('MIX_COMETCHAT_APP_ID');
        $this->appKey = env('COMETCHAT_REST_KEY');
        $this->http = Http::withHeaders([
            'appId' => $this->appId,
            'apiKey' => $this->appKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ]);
    }

    public function getTokenDetails(Request $request)
    {
        $user = auth()->user();
        $response = $this->http->post('https://api-us.cometchat.io/v2.0/users/' . $user->id . '/auth_tokens/authToken' . $user->auth_token);

        if ($response->ok()) {
            return response()->json(['token' => $response->json()->data->authToken]);
        } else {
            return response()->json(['error' => ['not authenticated']], 400);
        }
    }

    protected function getUserParams($user)
    {
        return [
            'uid' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar,
            'metadata' => json_encode(['nickname' => $user->nickname]),
            'secretid' => $user->secretid,
        ];
    }

    public function createUser($passedUser = null)
    {
        $user = $passedUser ? $passedUser : auth()->user();
        $this->http->post('https://api-us.cometchat.io/v2.0/users', $this->getUserParams($user));
        return $this->createToken($user);

    }

    public function updateUser($user)
    {
        return $response = $this->http->put('https://api-us.cometchat.io/v2.0/users/' . $user->id, $this->getUserParams($user));

    }

    public function deleteUser($id)
    {
        return $this->http->delete('https://api-us.cometchat.io/v2.0/users/' . $id);

    }

    public function createToken($passedUser = null)
    {
        $user = $passedUser ? $passedUser : auth()->user();

        //create token and store it
        $response = $this->http->post('https://api-us.cometchat.io/v2.0/users/' . $user->id . '/auth_tokens', [
            'force' => false,
        ]);
        if ($response->ok()) {
            $response = $response->json();
            $token = $response['data']['authToken'];
            DB::table('users')->where('id', $user->id)->update(['chat_token' => $token]);
            return $token;
        }else{
            $response->throw()->json();
        }

        return $response->json();
    }

    public function sendMsgToFollowers(Request $request)
    {
        $request->validate([
            'text' => ['string', 'required']
        ]);
        if($this->sendMsg(auth()->user()->id, auth()->user()->followers()->pluck('users.id')->toArray(), $request->input('text') )){
             return response()->json(["msg" => "Successfully sent messages"], 200);
        }
        return response()->json(["errors" => 'Server Error'], 400);
    }

    public function sendMsg($from, $to, $text = '')
    {
        if (empty($text)) {
            //fetch user default message
            $text = User::find($from);
            $text = $text->subscription_message;
        }
        if (!empty($text)) {
            $params = [
                "category" => "message",
                "type" => "text",
                "receiverType" => "user",
                "data" =>
                    ["text" => $text,]
            ];
            if (is_array($to)) {
                $params['multipleReceivers'] = ['uids' => $to, 'guids' => []];
            } else {
                $params["receiver"] = $to;
            }
            $response = $this->http->post('https://api-us.cometchat.io/v2.0/users/' . $from . '/messages', $params);
            if ($response->ok()) {
                return true;
            }
        }
        return false;
    }
}
